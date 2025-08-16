import express from "express";
import cors from "cors";
import simpleGit from "simple-git";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";
import dotenv from "dotenv";
import { DataAPIClient } from "@datastax/astra-db-ts";
import { HfInference } from "@huggingface/inference";
import Groq from "groq-sdk";

dotenv.config();

const hf = new HfInference(process.env.HF_TOKEN);
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const dbClient = new DataAPIClient(process.env.ASTRA_DB_APPLICATION_TOKEN);
const db = dbClient.db(process.env.ASTRA_DB_API_ENDPOINT);
const collection = db.collection(process.env.ASTRA_DB_COLLECTION);

const app = express();
const PORT = 3001;

const requestLogger = (req, res, next) => {
  console.log(`\n--- INCOMING REQUEST ---`);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log("Origin:", req.headers.origin);
  next();
};

app.use(requestLogger);

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
    if (ignoreDirs.has(entry.name) || ignoreFiles.has(entry.name)) continue;
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      const nestedFiles = await readAllFiles(fullPath);
      fileObjects = fileObjects.concat(nestedFiles);
    } else if (
      entry.isFile() &&
      allowedExtensions.has(path.extname(entry.name))
    ) {
      try {
        const content = await fs.readFile(fullPath, "utf-8");
        fileObjects.push({ path: fullPath, content });
      } catch (error) {
        console.log(`Skipping unreadable file: ${fullPath}`);
      }
    }
  }
  return fileObjects;
}

function chunkContent({ content, filePath, chunkSize = 1500, overlap = 200 }) {
  const chunks = [];
  if (!content) return chunks;

  for (let i = 0; i < content.length; i += chunkSize - overlap) {
    const chunk = content.substring(i, i + chunkSize);
    chunks.push({ path: filePath, content: chunk });
  }
  return chunks;
}

async function processAndEmbedRepo(repoUrl) {
  console.log(`[BACKGROUND] Starting processing for ${repoUrl}`);
  const repoName = repoUrl.split("/").pop().replace(".git", "");
  const localPath = path.join(
    __dirname,
    "..",
    "temp_repos",
    `${repoName}-${Date.now()}`
  );

  try {
    console.log(`[BACKGROUND] Cloning ${repoUrl} to ${localPath}...`);
    await simpleGit().clone(repoUrl, localPath);

    console.log("[BACKGROUND] Reading file contents...");
    const files = await readAllFiles(localPath);
    console.log(`[BACKGROUND] Found ${files.length} readable files.`);

    console.log("[BACKGROUND] Chunking all file content...");
    const allChunks = files.flatMap((file) =>
      chunkContent({ content: file.content, filePath: file.path })
    );

    if (allChunks.length === 0) {
      console.log("[BACKGROUND] No indexable files found. Aborting.");
      return; // The 'finally' block will still execute
    }
    console.log(
      `[BACKGROUND] Created ${allChunks.length} chunks. Preparing to embed...`
    );

    const batchSize = 20;
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      console.log(
        `[BACKGROUND] Processing batch ${i / batchSize + 1} of ${Math.ceil(
          allChunks.length / batchSize
        )}...`
      );

      const insertionPromises = batch.map(async (chunk) => {
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
    }

    console.log(
      `✅ [BACKGROUND] Successfully finished processing and embedding all ${allChunks.length} chunks.`
    );
  } catch (error) {
    console.error(
      `❌ [BACKGROUND] A critical error occurred during processing:`,
      error
    );
  } finally {
    console.log(
      `[CLEANUP] Attempting to delete temporary folder: ${localPath}`
    );
    try {
      await fs.access(localPath);
      await fs.rm(localPath, { recursive: true, force: true });
      console.log(`[CLEANUP] Successfully deleted temporary folder.`);
    } catch (cleanupError) {
      console.error(`[CLEANUP] Error during cleanup:`, cleanupError.message);
    }
  }
}

app.post("/index-repo", (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl) return res.status(400).json({ error: "repoUrl is required" });
  res.status(202).json({
    success: true,
    message: `Accepted. Indexing process for ${repoUrl} has started.`,
  });
  processAndEmbedRepo(repoUrl);
});

app.post("/api/ask", async (req, res) => {
  const { question } = req.body;
  if (!question) {
    return res.status(400).json({ error: "Question is required." });
  }

  try {
    const questionEmbedding = await hf.featureExtraction({
      model: "BAAI/bge-small-en-v1.5",
      inputs: question,
    });

    const vector = questionEmbedding[0];

    const searchResults = await collection.find(
      {},
      {
        sort: { $vector: vector },
        limit: 5,
      }
    );

    const documents = searchResults?.documents || [];
    console.log("Number of documents found:", documents.length);
    if (documents.length > 0) {
      console.log("First document found:", documents[0]);
    }

    const context = documents.map((doc) => doc.text).join("\n\n---\n\n");

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: [
            "You are an expert AI programmer and codebase assistant named 'Codebase Companion'.",
            "Your goal is to answer the user's question based *only* on the provided context, which contains relevant code snippets and file excerpts from a GitHub repository.",
            "Follow these rules strictly:",
            "1. Analyze the provided context thoroughly before answering.",
            "2. If the context contains the answer, explain it clearly and concisely. Provide code examples from the context if they are relevant to the user's question.",
            "3. If the context does NOT contain enough information to answer the question, you MUST respond with: 'I'm sorry, but I couldn't find enough information in the codebase to answer your question.' Do not make up answers or use your general knowledge.",
            "4. When referencing code, mention the file path if it's available in the context.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `CONTEXT:\n${context}\n\n---\n\nQUESTION:\n${question}`,
        },
      ],
      model: "llama3-8b-8192",
    });

    const answer = chatCompletion.choices[0]?.message?.content || "";
    res.json({ success: true, answer: answer });
  } catch (error) {
    console.error("--- ERROR IN /api/ask ---", error);
    res.status(500).json({
      error: "An error occurred on the server.",
      details: error.message,
      stack: error.stack,
    });
  }
});

const initializeDatabase = async () => {
  try {
    const collections = await db.listCollections();
    const collectionExists = collections.some(
      (c) => c.name === process.env.ASTRA_DB_COLLECTION
    );

    if (!collectionExists) {
      await db.createCollection(process.env.ASTRA_DB_COLLECTION);
      console.log(`Collection '${process.env.ASTRA_DB_COLLECTION}' created.`);
    } else {
      console.log(
        `Collection '${process.env.ASTRA_DB_COLLECTION}' already exists.`
      );
    }
  } catch (e) {
    console.error("Error initializing database:", e);
  }
};

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);

  initializeDatabase();
});

setInterval(() => {}, 1 << 30);
