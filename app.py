import os
import shutil
from typing import List, Optional
from pathlib import Path

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import requests
from rag_engine import RAGPipeline

# Initialize FastAPI App
app = FastAPI(
    title="Intelliquiz API",
    description="Multi-document RAG Chatbot & Quiz Generator powered by LangChain and Ollama Mistral",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory setup
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

# Initialize RAG Pipeline
rag_pipeline = RAGPipeline(model_name="mistral")

# Pydantic Schemas
class ChatRequest(BaseModel):
    query: str
    model: Optional[str] = "mistral"

class QuizRequest(BaseModel):
    num_questions: Optional[int] = 5
    model: Optional[str] = "mistral"

class SummarizeRequest(BaseModel):
    model: Optional[str] = "mistral"


@app.get("/api/models")
def get_available_models():
    """Fetch installed Ollama models from local daemon."""
    try:
        res = requests.get("http://localhost:11434/api/tags", timeout=3)
        if res.status_code == 200:
            data = res.json()
            models = [m["name"] for m in data.get("models", [])]
            return {"status": "online", "models": models, "default": "mistral:latest"}
    except Exception as e:
        pass
    return {
        "status": "offline",
        "models": ["mistral:latest", "llama3.1:latest", "llama3:latest"],
        "default": "mistral:latest"
    }


@app.post("/api/upload")
async def upload_files(files: List[UploadFile] = File(...)):
    """Upload multiple PPTX, PDF, DOCX, or TXT files and index into FAISS RAG vector store."""
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    saved_paths = []
    for file in files:
        file_path = UPLOAD_DIR / file.filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_paths.append(str(file_path))

    # Index saved files in RAG pipeline
    result = rag_pipeline.process_and_index_files(saved_paths)
    return {
        "message": f"Successfully processed {len(saved_paths)} file(s).",
        "details": result,
        "indexed_files": list(rag_pipeline.indexed_files.keys())
    }


@app.get("/api/documents")
def get_indexed_documents():
    """Get list of indexed documents and status."""
    return {
        "files": rag_pipeline.indexed_files,
        "total_files": len(rag_pipeline.indexed_files),
        "total_chunks": len(rag_pipeline.documents),
        "is_ready": len(rag_pipeline.documents) > 0
    }


@app.post("/api/chat")
def chat_with_rag(request: ChatRequest):
    """Answer user query using RAG with source citations."""
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    res = rag_pipeline.query_rag(user_query=request.query, model=request.model)
    return res


@app.post("/api/generate-quiz")
def generate_quiz(request: QuizRequest):
    """Generate interactive MCQs based on indexed document contents."""
    quizzes = rag_pipeline.generate_quiz(num_questions=request.num_questions, model=request.model)
    return {"quiz": quizzes, "total": len(quizzes)}


@app.post("/api/summarize")
def summarize_documents(request: SummarizeRequest):
    """Generate key summaries for indexed documents."""
    summaries = rag_pipeline.generate_summary(model=request.model)
    return {"summaries": summaries}


@app.delete("/api/clear")
def clear_all():
    """Clear all indexed documents and stored files."""
    rag_pipeline.clear_database()
    for file in UPLOAD_DIR.glob("*"):
        try:
            file.unlink()
        except Exception:
            pass
    return {"message": "All uploaded documents and vector index have been cleared."}


# Serve Static Files
static_dir = Path("static")
static_dir.mkdir(exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/", response_class=HTMLResponse)
def read_root():
    """Serve index.html landing page."""
    index_path = static_dir / "index.html"
    if index_path.exists():
        with open(index_path, "r", encoding="utf-8") as f:
            return f.read()
    return "<h1>Intelliquiz API Running! Static index.html not found.</h1>"


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
