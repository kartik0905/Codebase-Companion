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

This full-stack AI application allows you to **chat with any public GitHub repository**.  
It fetches, indexes, and stores repository content in a vector database, enabling **semantic search** and **context-aware answers** using a **RAG pipeline**.

---

## ✨ Features

- 📥 **Repo Indexing** — Fetch & parse any public GitHub repo
- 🧠 **RAG Pipeline** — Accurate, context-driven answers
- 📊 **Vector Search** — Store & retrieve embeddings with Astra DB
- 🔍 **Code Location Search** — Find exact file & line references
- ⚡ **Fast Inference** — Powered by Groq LLaMA
- 🌐 **Modern UI** — Built with React & Tailwind CSS
- 🛠 **API Integration** — Node.js backend for processing

---

## 🛠️ Tech Stack

| Layer | Technologies | Purpose |
|------|--------------|---------|
| **Frontend** | React, Tailwind CSS | Responsive & modern UI |
| **Backend** | Node.js, Express.js | API routing & processing |
| **AI & Data** | Hugging Face, Astra DB | Embeddings & vector search |
| **LLM** | Groq LLaMA | Contextual answer generation |

---

## ⚙️ How It Works (RAG Pipeline)

### Phase 1: Repo Fetch & Index

1. **User Input**: Enter GitHub repo URL.
2. **Fetch & Parse**: Backend downloads repo contents.
3. **Embedding**: Hugging Face generates embeddings.
4. **Storage**: Astra DB stores vector data.

### Phase 2: Query

1. **Semantic Search**: Astra DB retrieves top-matching chunks.
2. **Context Assembly**: Relevant code/docs merged.
3. **LLM Response**: Groq generates the final answer.

---

## 🧪 Local Development

### 🔧 Requirements

- Node.js (v18+)
- Hugging Face API Key
- Astra DB credentials
- Groq API Key

---

## 🏁 Getting Started

### 1. Clone & Setup

```bash
git clone https://github.com/kartik0905/ai-github-repo-chatbot.git
cd ai-github-repo-chatbot

# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install
```

### 2. Add API Keys

Create `.env` in `server/`:

```
HUGGINGFACE_API_KEY=your_key
ASTRA_DB_ID=your_id
ASTRA_DB_REGION=your_region
ASTRA_DB_KEY=your_key
GROQ_API_KEY=your_key
```

---

## 🚦 Run the App

**Terminal 1 — Backend**
```bash
cd server
npm run dev
# Runs on http://localhost:3001
```

**Terminal 2 — Frontend**
```bash
cd client
npm run dev
# Runs on http://localhost:5173
```

---

## 📁 Folder Structure

```
codebase-companion/
├── client/
│   ├── src/
│   └── package.json
├── server/
│   ├── server.js
│   ├── routes/
│   └── package.json
├── README.md
└── ...
```

---

## 🙌 Acknowledgments

- [Hugging Face](https://huggingface.co/)
- [Astra DB](https://www.datastax.com/astra)
- [Groq](https://groq.com/)
- [React](https://react.dev/)
- [Tailwind CSS](https://tailwindcss.com/)

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/kartik0905">Kartik Garg</a>
</div>
