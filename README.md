# 🧠 INTELLIQUIZ: Multi-Document AI RAG Chatbot & Quiz Generator

**INTELLIQUIZ** is an intelligent academic assistant built for B.Tech AI & DS coursework. It enables users to upload unlimited heterogeneous document files (PowerPoint Presentations `.pptx`, PDFs `.pdf`, Word Documents `.docx`, and Text files `.txt`), index them into a high-performance vector database, ask context-aware questions with source page & slide citations, and automatically generate interactive practice multiple-choice quizzes (MCQs).

---

## ✨ Features

- 📄 **Multi-Format Ingestion**: Simultaneous drag-and-drop parsing for PPTX, PDF, DOCX, and TXT files.
- 🔍 **Vector RAG Engine**: Powered by **LangChain** and **FAISS** in-memory vector store using local HuggingFace embeddings (`all-MiniLM-L6-v2`).
- 🤖 **Local LLM Integration**: Uses **Ollama** running **`mistral:latest`** (with model switching support for `llama3.1`, `llama3`).
- 📌 **Source Citations**: Every response references exact file names and slide/page numbers used for context synthesis.
- 🎲 **Interactive MCQ Quiz Engine**: Auto-generates customized multiple-choice practice quizzes from uploaded document contents with real-time scoring and explanation drop-downs.
- 🎨 **Claymorphism & Neo-Brutalism UI**: Modern 3D soft inflated clay aesthetic with animated floating glass background elements.

---

## 🛠️ Tech Stack

- **Backend**: Python 3.11, FastAPI, Uvicorn
- **AI & RAG Pipeline**: LangChain, FAISS Vector Store, SentenceTransformers (`all-MiniLM-L6-v2`), Ollama (`mistral:latest`), `python-pptx`, `pypdf`, `python-docx`
- **Frontend**: HTML5, Vanilla CSS3 (Claymorphism + Neo-Brutalism + CSS Animations), JavaScript (ES6+), Marked.js

---

## 🚀 Quick Start Guide

### Prerequisites
1. **Python 3.11+** installed.
2. **Ollama** installed and running locally:
   ```bash
   ollama pull mistral
   ollama serve
   ```

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/manireddy2920/Intelliquiz.git
   cd Intelliquiz
   ```

2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Launch the application:
   ```bash
   python app.py
   ```

4. Open your browser and navigate to:
   **`http://localhost:8000`**

---

## 🧪 Verification & Testing

Run automated end-to-end RAG pipeline test:
```bash
python test_rag.py
```

---

## 📂 Project Structure

```text
Intelliquiz/
├── app.py                   # FastAPI application server & REST endpoints
├── rag_engine.py            # LangChain RAG pipeline, FAISS vector DB & Quiz generator
├── requirements.txt         # Python dependencies
├── test_rag.py              # Automated RAG verification test
├── create_sample_ppt.py     # Sample PPT generator script for testing
├── static/
│   ├── index.html           # Main dashboard UI layout
│   ├── styles.css           # Claymorphism & Neo-Brutalism design system
│   └── app.js               # Frontend state management & API interactions
├── uploads/                 # Storage for user-uploaded document files
└── sample_data/             # Test document files
```
