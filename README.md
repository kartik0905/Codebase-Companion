<div align="center">

# 🤖 Codebase-Companion 
### Chat with any public GitHub repository using Retrieval-Augmented Generation (RAG)

</div>

<p align="center">
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React"/>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js"/>
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express"/>
  <img src="https://img.shields.io/badge/Hugging%20Face-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black" alt="Hugging Face"/>
  <img src="https://img.shields.io/badge/Astra%20DB-3A0CA3?style=for-the-badge&logo=datastax&logoColor=white" alt="Astra DB"/>
  <img src="https://img.shields.io/badge/Groq-111111?style=for-the-badge&logo=groq&logoColor=white" alt="Groq"/>
</p>

---

## 📌 Overview

**Codebase Companion** is a full‑stack AI app that lets you **chat with any public GitHub repository**. It clones a repo, chunks & embeds the content, stores vectors in **Astra DB**, and answers questions using a **RAG pipeline** powered by **Hugging Face embeddings** and **Groq (Llama 3 8B)**.

> ℹ️ Tip: Add a real screenshot or GIF of the app in action.

![App Screenshot Placeholder](https://i.imgur.com/example.png)

---

## ✨ Features

- 📚 **Multi‑Repository Support** – Index multiple repos; switch chat sessions instantly.
- 🧠 **Intelligent Q&A** – Ask about logic, structure, or purpose in natural language.
- 🔁 **Streaming Responses** – Word‑by‑word streaming for a ChatGPT‑like feel.
- 📎 **Source Citing** – Each answer lists the code files used as context.
- 🧩 **Modern RAG Pipeline** – Accurate, grounded answers using retrieve‑then‑read.
- 🔍 **Code Location Search** – Surface exact files/paths relevant to your query.
- ⚡ **Fast Inference** – Groq Llama 3 8B for low‑latency responses.

---

## 🛠️ Tech Stack

- **Frontend:** React, Vite, Tailwind CSS  
- **Backend:** Node.js, Express.js  
- **AI & Data Processing:**  
  - **Embedding Model:** `BAAI/bge-small-en-v1.5` (Hugging Face)  
  - **Vector Database:** Astra DB (DataStax)  
  - **LLM:** Groq – Llama 3 8B  
- **Tools:** `simple-git`, `cors`, `dotenv`, `concurrently`

---

## ⚙️ How It Works (RAG Pipeline)

### Phase 1 — Index
1. **Input**: User submits a public GitHub repo URL.
2. **Clone & Parse**: Backend clones the repo and walks the file tree.
3. **Chunking**: Code/docs are split into semantic chunks.
4. **Embedding**: Chunks embedded via `BAAI/bge-small-en-v1.5`.
5. **Storage**: Vectors + metadata saved to **Astra DB** (collections created dynamically).

### Phase 2 — Query
1. **Semantic Retrieval**: Top‑k chunks fetched from Astra DB.
2. **Context Assembly**: Relevant snippets + paths composed.
3. **Answer Generation**: **Groq Llama 3 8B** produces the final, cited answer.

---

## 🧪 Local Development

### Prerequisites
- Node.js v18+
- npm
- Accounts/keys for **Hugging Face**, **Groq**, and **Astra DB**

### Clone
```bash
git clone https://github.com/kartik0905/codebase-companion.git
cd codebase-companion
```

### Install (Monorepo)
If using a single repo with shared root scripts:
```bash
npm install
```

### Install (Split: client / server)
```bash
# Frontend
cd client && npm install
# Backend
cd ../server && npm install
```

### Environment Variables
Create a `.env` **in the backend root** (`server/.env` if split; project root if monorepo) with:
```
# Hugging Face
HF_TOKEN="hf_..."  # used for BAAI/bge-small-en-v1.5

# Groq
GROQ_API_KEY="gsk_..."  # Llama 3 8B

# Astra DB (DataStax)
ASTRA_DB_APPLICATION_TOKEN="AstraCS:..."
ASTRA_DB_API_ENDPOINT="https://..."  # REST endpoint for your DB keyspace
ASTRA_DB_COLLECTION="codebase_chunks"  # app may create collections dynamically
```
> Keep keys private. Do **not** commit `.env`.

---

## 🚀 Run the App

### All‑in‑one (concurrently)
```bash
npm run dev
# Backend: http://localhost:3001
# Frontend: http://localhost:5173
```

### Split terminals
**Terminal 1 — Backend**
```bash
cd server
npm run dev
# http://localhost:3001
```
**Terminal 2 — Frontend**
```bash
cd client
npm run dev
# http://localhost:5173
```

---

## 📁 Folder Structure (example)
```
codebase-companion/
├─ client/
│  ├─ src/
│  └─ package.json
├─ server/
│  ├─ routes/
│  ├─ services/
│  ├─ rag/
│  │  ├─ chunking.js
│  │  ├─ embed.js
│  │  └─ retrieve.js
│  ├─ server.js
│  └─ package.json
├─ README.md
└─ ...
```

---

## 🔌 API (quick peek)

**POST** `/api/index`  
Body: `{ repoUrl: string }` → clones, chunks, embeds, and stores vectors.

**POST** `/api/chat`  
Body: `{ repoId: string, question: string }` → streams an answer + cites files.

> Endpoint names are placeholders; adjust to match your actual routes.

---

## 🧭 Tips
- Ignore large/binary folders (`.git`, `node_modules`, `dist`, images) during indexing.
- Tune chunk size/overlap for your languages to maximize retrieval quality.
- Persist per‑repo metadata so users can switch sessions quickly.

---

## 🗺️ Roadmap / Future Improvements
- 🔐 **User Authentication** to associate repos with users
- 🔒 **Private Repos** via GitHub OAuth
- ☁️ **Cloud Deploy** (Vercel + Render/Fly/railway)
- 📈 **Analytics** (query quality, hit‑rate, latency)
- 🧪 **Eval Suite** for retrieval precision/recall

---

## 🙌 Acknowledgments
- [Hugging Face](https://huggingface.co/)
- [Astra DB (DataStax)](https://www.datastax.com/astra)
- [Groq](https://groq.com/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/kartik0905">Kartik Garg</a>
</div>
