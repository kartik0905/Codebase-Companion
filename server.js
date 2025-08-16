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

const getRepoId = (repoUrl) => {
  return new URL(repoUrl).pathname.substring(1).replace(/[/-]/g, "_");
};

const app = express();
const PORT = 3001;

const requestLogger = (req, res, next) => {
  console.log(`\n--- INCOMING REQUEST ---`);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  console.log("Origin:", req.headers.origin);
  next();
};

app.use(requestLogger);

const allowedOrigins = [
  "http://localhost:5173",
  "https://codebase-companion.vercel.app",
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) === -1) {
        const msg =
          "The CORS policy for this site does not allow access from the specified Origin.";
        return callback(new Error(msg), false);
      }
      return callback(null, true);
    },
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

async function processAndEmbedRepo(repoUrl, repoId) {
  console.log(`[BACKGROUND] Starting processing for ${repoId}`);
  const localPath = path.join(
    __dirname,
    "..",
    "temp_repos",
    `${repoId}-${Date.now()}`
  );

  try {
    await db.createCollection(repoId, {
      vector: {
        dimension: 384,
        metric: "cosine",
      },
    });
    console.log(`[BACKGROUND] Created new Astra DB collection: ${repoId}`);
    const collection = db.collection(repoId);

    console.log(`[BACKGROUND] Cloning ${repoUrl}...`);
    await simpleGit().clone(repoUrl, localPath);
    const files = await readAllFiles(localPath);
    const allChunks = files.flatMap((file) =>
      chunkContent({ content: file.content, filePath: file.path })
    );
    if (allChunks.length === 0) {
      console.log("[BACKGROUND] No indexable files found. Aborting.");
      return;
    }

    const batchSize = 20;
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
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

    console.log(`✅ [BACKGROUND] Successfully finished processing ${repoId}`);
  } catch (error) {
    console.error(`❌ [BACKGROUND] Error processing ${repoId}:`, error);
  } finally {
    console.log(`[CLEANUP] Cleaning up temporary folder...`);
    await fs.rm(localPath, { recursive: true, force: true });
  }
}

app.post("/index-repo", async (req, res) => {
  const { repoUrl } = req.body;
  if (!repoUrl) return res.status(400).json({ error: "repoUrl is required" });

  try {
    const repoId = getRepoId(repoUrl);

    const collections = await db.listCollections();
    const collectionExists = collections.some((c) => c.name === repoId);

    if (collectionExists) {
      console.log(`[SERVER] Repo ${repoId} is already indexed.`);
      return res.status(200).json({
        success: true,
        message: `Repository is already indexed and ready.`,
        repoId: repoId,
      });
    }

    res.status(202).json({
      success: true,
      message: `Accepted. Indexing process for ${repoId} has started.`,
      repoId: repoId,
    });

    processAndEmbedRepo(repoUrl, repoId);
  } catch (error) {
    console.error("Error in /index-repo:", error);
    res.status(500).json({ error: "An error occurred." });
  }
});

app.get("/api/repositories", async (req, res) => {
  try {
    const collections = await db.listCollections();
    const repoNames = collections.map((c) => c.name);
    res.json({ success: true, repositories: repoNames });
  } catch (error) {
    console.error("--- ERROR IN /api/repositories ---", error);
    res.status(500).json({ error: "Failed to fetch repositories." });
  }
});

app.post("/api/ask", async (req, res) => {
  const { question, repoId } = req.body;
  if (!question || !repoId) {
    return res.status(400).json({ error: "Question and repoId are required." });
  }

  try {
    const collection = db.collection(repoId);

    const questionEmbedding = await hf.featureExtraction({
      model: "BAAI/bge-small-en-v1.5",
      inputs: question,
    });
    const vector = questionEmbedding[0];

    const searchResults = await collection.find(
      {},
      {
        sort: { $vector: vector },
        limit: 10,
      }
    );
    const documents = searchResults?.documents || [];
    const context = documents
      .map((doc) => `File Path: ${doc.source}\n---\n${doc.text}`)
      .join("\n\n---\n\n");
    const sources = documents.map((doc) => ({
      source: doc.source,
      text: doc.text,
    }));

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Source-Documents", JSON.stringify(sources));
    res.flushHeaders();

    const stream = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: [
            "You are 'Codebase Companion', a hyper-literal AI assistant.",
            "You will be given a QUESTION and a CONTEXT from a user's codebase.",
            "Your ONLY task is to answer the QUESTION based **100% EXCLUSIVELY** on the information within the provided CONTEXT.",
            "**CRITICAL DIRECTIVES:**",
            "1. **DO NOT INFER OR HALLUCINATE:** Never assume a file exists unless you see its path in the CONTEXT. Never guess the project's framework or overall structure. Your knowledge is limited **ONLY** to the code snippets in the CONTEXT.",
            "2. **IDENTIFY LANGUAGE FIRST:** Before answering, identify the programming language from the file paths (e.g., `.js`, `.py`) and code syntax in the CONTEXT. State the language you see.",
            "3. **BE FACTUAL:** Ground every statement you make to a specific part of the CONTEXT.",
            "4. **IF THE ANSWER IS NOT IN THE CONTEXT, DO NOT ANSWER:** If the provided snippets do not contain enough information to answer the question, you **MUST** reply with the single sentence: 'I'm sorry, the provided context from the codebase does not contain enough information to answer that question.' Do not offer alternatives or generic examples.",
          ].join("\n"),
        },
        {
          role: "user",
          content: `CONTEXT:\n${context}\n\n---\n\nQUESTION:\n${question}`,
        },
      ],
      model: "llama3-8b-8192",
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      res.write(content);
    }

    res.end();
  } catch (error) {
    console.error("--- ERROR IN /api/ask ---", error);
    if (!res.headersSent) {
      res.status(500).json({
        error: "An error occurred on the server.",
        details: error.message,
      });
    } else {
      res.end();
    }
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
