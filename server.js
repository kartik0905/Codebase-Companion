import express from "express";
import cors from "cors";
import simpleGit from "simple-git";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import dotenv from "dotenv";
import { DataAPIClient } from "@datastax/astra-db-ts";
import { HfInference } from "@huggingface/inference";

dotenv.config();

// Hugging Face inference
const hf = new HfInference(process.env.HF_TOKEN);

// Astra DB client — no namespace anymore
const dbClient = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
const db = dbClient.db(process.env.ASTRA_DB_API_ENDPOINT);
const collection = db.collection(process.env.ASTRA_DB_COLLECTION);

const app = express();
const PORT = 3001;
app.use(cors());
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- HELPER FUNCTIONS ---

async function readAllFiles(dirPath) {
  let fileObjects = [];
  const ignoreDirs = new Set([".git", "node_modules", "dist", "build"]);
  const ignoreFiles = new Set([
    ".DS_Store",
    ".gitignore",
    "package.json",
    "package-lock.json",
  ]);
  const allowedExtensions = new Set([
    ".js",
    ".jsx",
    ".ts",
    ".tsx",
    ".css",
    ".html",
    ".py",
    ".md",
  ]);

  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    if (ignoreDirs.has(entry.name) || ignoreFiles.has(entry.name)) {
      continue;
    }
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const nestedFiles = await readAllFiles(fullPath);
      fileObjects = fileObjects.concat(nestedFiles);
    } else if (entry.isFile()) {
      const extension = path.extname(entry.name);
      if (allowedExtensions.has(extension)) {
        try {
          const content = await fs.readFile(fullPath, "utf-8");
          fileObjects.push({ path: fullPath, content });
        } catch (error) {
          console.log(`Skipping unreadable file: ${fullPath}`);
        }
      }
    }
  }
  return fileObjects;
}

function chunkContent({ content, filePath, chunkSize = 40, overlap = 5 }) {
  const chunks = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i += chunkSize - overlap) {
    const chunkLines = lines.slice(i, i + chunkSize);
    const chunkText = chunkLines.join("\n");
    chunks.push({ path: filePath, content: chunkText });
  }
  return chunks;
}

// --- BACKGROUND PROCESSING FUNCTION ---

async function processAndEmbedRepo(repoUrl) {
  console.log(`[BACKGROUND] Starting processing for ${repoUrl}`);
  const repoName = repoUrl.split("/").pop().replace(".git", "");
  const localPath = path.join(__dirname, "repos", `${repoName}-${Date.now()}`);

  try {
    console.log(`[BACKGROUND] Cloning ${repoUrl}...`);
    await simpleGit().clone(repoUrl, localPath);

    console.log("[BACKGROUND] Reading file contents...");
    const files = await readAllFiles(localPath);

    console.log("[BACKGROUND] Chunking all file content...");
    const allChunks = [];
    for (const file of files) {
      const chunks = chunkContent({
        content: file.content,
        filePath: file.path,
      });
      allChunks.push(...chunks);
    }

    if (allChunks.length === 0) {
      console.log("[BACKGROUND] No indexable files found. Aborting.");
      return;
    }

    console.log(
      `[BACKGROUND] Embedding ${allChunks.length} chunks and storing in Astra DB...`
    );
    const insertionPromises = allChunks.map(async (chunk) => {
      const embedding = await hf.featureExtraction({
        model: "BAAI/bge-small-en-v1.5",
        inputs: chunk.content,
      });

      return collection.insertOne({
        text: chunk.content,
        source: chunk.path,
        $vector: embedding,
      });
    });
    await Promise.all(insertionPromises);

    console.log(`✅ [BACKGROUND] Successfully finished processing ${repoUrl}`);
  } catch (error) {
    console.error(`❌ [BACKGROUND] Error processing ${repoUrl}:`, error);
  } finally {
    console.log(`[BACKGROUND] Cleaning up local repository at ${localPath}...`);
    await fs.rm(localPath, { recursive: true, force: true });
  }
}

// --- API ENDPOINT ---

app.post("/index-repo", (req, res) => {
  const { repoUrl } = req.body;

  if (!repoUrl) {
    return res.status(400).json({ error: "repoUrl is required" });
  }

  // Immediately send a response to the browser
  res.status(202).json({
    success: true,
    message: `Accepted. Indexing process for ${repoUrl} has started in the background. Check server logs for progress.`,
  });

  // Start the long process but DO NOT await it.
  // The request handler finishes immediately.
  processAndEmbedRepo(repoUrl);
});

// --- SERVER STARTUP ---

const initializeDatabase = async () => {
  try {
    await db.createCollection(process.env.ASTRA_DB_COLLECTION);
    console.log(`Collection '${process.env.ASTRA_DB_COLLECTION}' is ready.`);
  } catch (e) {
    if (e.message.includes("already exists")) {
      console.log(
        `Collection '${process.env.ASTRA_DB_COLLECTION}' already exists.`
      );
    } else {
      console.error("Fatal: Error initializing database:", e);
      process.exit(1);
    }
  }
};

const startServer = async () => {
  await initializeDatabase();
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
};

startServer();
