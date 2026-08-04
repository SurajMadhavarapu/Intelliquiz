// Intelliquiz Frontend Logic

let selectedFiles = [];
let indexedDocuments = {};

document.addEventListener("DOMContentLoaded", () => {
  setupDragAndDrop();
  checkOllamaStatus();
  refreshDocumentList();
});

// Check Ollama daemon status
async function checkOllamaStatus() {
  try {
    const res = await fetch("/api/models");
    const data = await res.json();
    const badge = document.getElementById("statusBadge");
    const text = document.getElementById("statusText");
    const select = document.getElementById("modelSelect");

    if (data.status === "online") {
      badge.style.borderColor = "var(--accent-cyan)";
      text.innerText = `Ollama (${data.models.length} models)`;
      
      // Populate select
      select.innerHTML = "";
      data.models.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m;
        opt.innerText = m;
        if (m === "mistral:latest" || m === "mistral") opt.selected = true;
        select.appendChild(opt);
      });
    } else {
      text.innerText = "Ollama Offline";
    }
  } catch (err) {
    console.error("Error checking Ollama status:", err);
  }
}

// Drag & Drop File Setup
function setupDragAndDrop() {
  const dropZone = document.getElementById("dropZone");
  const fileInput = document.getElementById("fileInput");

  ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, preventDefaults, false);
  });

  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ["dragenter", "dragover"].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.add("dragover"), false);
  });

  ["dragleave", "drop"].forEach(eventName => {
    dropZone.addEventListener(eventName, () => dropZone.classList.remove("dragover"), false);
  });

  dropZone.addEventListener("drop", (e) => {
    const files = Array.from(e.dataTransfer.files);
    handleFileSelection(files);
  });

  fileInput.addEventListener("change", (e) => {
    const files = Array.from(e.target.files);
    handleFileSelection(files);
  });
}

function handleFileSelection(files) {
  selectedFiles = [...selectedFiles, ...files];
  renderSelectedFiles();
}

function renderSelectedFiles() {
  const fileList = document.getElementById("fileList");
  if (selectedFiles.length === 0 && Object.keys(indexedDocuments).length === 0) {
    fileList.innerHTML = `<div style="text-align: center; color: var(--text-muted); font-size: 13px; padding: 10px 0;">No documents indexed yet. Upload PPTs or PDFs above!</div>`;
    return;
  }

  fileList.innerHTML = "";

  // Show newly selected pending files
  selectedFiles.forEach((file, index) => {
    const ext = file.name.split('.').pop().toLowerCase();
    const div = document.createElement("div");
    div.className = "file-item";
    div.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
        <span class="file-badge ${ext}">${ext.toUpperCase()}</span>
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${file.name}</span>
      </div>
      <button onclick="removeSelectedFile(${index})" style="background: none; border: none; color: var(--accent-pink); cursor: pointer; font-weight: 800;">✕</button>
    `;
    fileList.appendChild(div);
  });

  // Show already indexed files
  Object.keys(indexedDocuments).forEach(filename => {
    const ext = filename.split('.').pop().toLowerCase();
    const div = document.createElement("div");
    div.className = "file-item";
    div.style.borderColor = "var(--accent-cyan)";
    div.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
        <span class="file-badge ${ext}">${ext.toUpperCase()}</span>
        <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;">${filename}</span>
      </div>
      <span style="font-size: 10px; color: var(--accent-cyan); font-weight: 800;">INDEXED</span>
    `;
    fileList.appendChild(div);
  });

  document.getElementById("docCountBadge").innerText = `${selectedFiles.length + Object.keys(indexedDocuments).length} Files`;
}

function removeSelectedFile(index) {
  selectedFiles.splice(index, 1);
  renderSelectedFiles();
}

// Upload & Index Files
async function uploadFiles() {
  if (selectedFiles.length === 0) {
    alert("Please select or drop files first!");
    return;
  }

  const uploadBtn = document.getElementById("uploadBtn");
  uploadBtn.disabled = true;
  uploadBtn.innerHTML = `<div class="spinner"></div> Indexing...`;

  const formData = new FormData();
  selectedFiles.forEach(file => formData.append("files", file));

  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData
    });
    const data = await res.json();
    
    if (res.ok) {
      alert(`Indexed ${data.details.files_indexed} file(s) into FAISS Vector Database!`);
      selectedFiles = [];
      await refreshDocumentList();
    } else {
      alert(`Upload error: ${data.detail || "Failed to process files."}`);
    }
  } catch (err) {
    alert(`Upload failed: ${err.message}`);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = `⚡ Index Documents`;
  }
}

async function refreshDocumentList() {
  try {
    const res = await fetch("/api/documents");
    const data = await res.json();
    indexedDocuments = data.files || {};
    renderSelectedFiles();
  } catch (err) {
    console.error("Error fetching document list:", err);
  }
}

// Tab Switching
function switchTab(tabId, btn) {
  document.querySelectorAll(".tab-content").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));

  document.getElementById(tabId).classList.add("active");
  btn.classList.add("active");
}

// Quick Prompt Handler
function useQuickPrompt(text) {
  const input = document.getElementById("chatInput");
  input.value = text;
  sendQuery();
}

function handleKeyPress(e) {
  if (e.key === "Enter") sendQuery();
}

// RAG Chat Send Query
async function sendQuery() {
  const input = document.getElementById("chatInput");
  const query = input.value.trim();
  if (!query) return;

  const chatHistory = document.getElementById("chatHistory");
  const model = document.getElementById("modelSelect").value;

  // Append User Message
  const userDiv = document.createElement("div");
  userDiv.className = "chat-message user";
  userDiv.innerHTML = `
    <div class="avatar user">👤</div>
    <div class="message-bubble">${escapeHtml(query)}</div>
  `;
  chatHistory.appendChild(userDiv);

  input.value = "";
  chatHistory.scrollTop = chatHistory.scrollHeight;

  // Append Loading Bot Message
  const botDiv = document.createElement("div");
  botDiv.className = "chat-message bot";
  botDiv.innerHTML = `
    <div class="avatar bot">🤖</div>
    <div class="message-bubble" id="latestBotMsg">
      <div style="display: flex; align-items: center; gap: 8px;">
        <div class="spinner"></div> Synthesizing answer with ${model}...
      </div>
    </div>
  `;
  chatHistory.appendChild(botDiv);
  chatHistory.scrollTop = chatHistory.scrollHeight;

  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: query, model: model })
    });
    const data = await res.json();

    const botBubble = document.getElementById("latestBotMsg");
    botBubble.removeAttribute("id");

    // Render markdown answer
    let formattedAnswer = typeof marked !== "undefined" ? marked.parse(data.answer) : data.answer;
    
    // Citations HTML
    let citationsHtml = "";
    if (data.citations && data.citations.length > 0) {
      citationsHtml = `<div class="citations-wrapper">
        <strong style="width: 100%; font-size: 11px; color: var(--accent-yellow);">SOURCES USED:</strong>
        ${data.citations.map(c => `<span class="citation-chip" title="${escapeHtml(c.snippet)}">📄 ${escapeHtml(c.source)} (${c.location})</span>`).join("")}
      </div>`;
    }

    botBubble.innerHTML = formattedAnswer + citationsHtml;
  } catch (err) {
    const botBubble = document.getElementById("latestBotMsg");
    botBubble.removeAttribute("id");
    botBubble.innerHTML = `<span style="color: var(--accent-pink);">⚠️ Failed to connect to backend: ${err.message}</span>`;
  }

  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Generate MCQ Quiz
async function generateQuiz() {
  const container = document.getElementById("quizContainer");
  const numQuestions = document.getElementById("quizNumSelect").value;
  const model = document.getElementById("modelSelect").value;

  container.innerHTML = `<div style="text-align: center; padding: 40px;"><div class="spinner" style="margin: 0 auto 16px auto;"></div> Generating ${numQuestions} MCQs from document vector store...</div>`;

  try {
    const res = await fetch("/api/generate-quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ num_questions: parseInt(numQuestions), model: model })
    });
    const data = await res.json();

    if (!data.quiz || data.quiz.length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--accent-pink);">No quiz questions generated. Please index documents first!</div>`;
      return;
    }

    container.innerHTML = "";
    data.quiz.forEach((q, idx) => {
      const card = document.createElement("div");
      card.className = "quiz-card";
      card.innerHTML = `
        <div class="quiz-question">Q${idx + 1}. ${escapeHtml(q.question)}</div>
        <div class="quiz-options">
          ${q.options.map((opt, oIdx) => `
            <button class="option-btn" onclick="checkQuizAnswer(this, ${oIdx}, ${q.answer_index}, 'exp_${idx}')">
              ${String.fromCharCode(65 + oIdx)}. ${escapeHtml(opt)}
            </button>
          `).join("")}
        </div>
        <div class="explanation-box" id="exp_${idx}">
          <strong>💡 Explanation:</strong> ${escapeHtml(q.explanation)}<br>
          <span style="font-size: 11px; opacity: 0.8;">Source: ${escapeHtml(q.source || "Indexed Notes")}</span>
        </div>
      `;
      container.appendChild(card);
    });

  } catch (err) {
    container.innerHTML = `<div style="text-align: center; color: var(--accent-pink);">Error generating quiz: ${err.message}</div>`;
  }
}

function checkQuizAnswer(btn, selectedIdx, correctIdx, expId) {
  const parent = btn.parentElement;
  const buttons = parent.querySelectorAll(".option-btn");

  buttons.forEach((b, idx) => {
    b.disabled = true;
    if (idx === correctIdx) {
      b.classList.add("correct");
    } else if (idx === selectedIdx) {
      b.classList.add("wrong");
    }
  });

  const expBox = document.getElementById(expId);
  if (expBox) expBox.style.display = "block";
}

// Document Summaries
async function fetchSummaries() {
  const container = document.getElementById("summaryContainer");
  const model = document.getElementById("modelSelect").value;

  container.innerHTML = `<div style="text-align: center; padding: 40px;"><div class="spinner" style="margin: 0 auto 16px auto;"></div> Generating document summaries...</div>`;

  try {
    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: model })
    });
    const data = await res.json();

    if (!data.summaries || Object.keys(data.summaries).length === 0) {
      container.innerHTML = `<div style="text-align: center; color: var(--accent-pink);">No documents found to summarize. Upload files first!</div>`;
      return;
    }

    container.innerHTML = "";
    Object.entries(data.summaries).forEach(([file, summary]) => {
      const card = document.createElement("div");
      card.className = "quiz-card";
      card.innerHTML = `
        <h3 style="font-family: 'Space Grotesk', sans-serif; color: var(--accent-cyan);">📄 ${escapeHtml(file)}</h3>
        <div style="font-size: 14px; line-height: 1.6;">${typeof marked !== "undefined" ? marked.parse(summary) : escapeHtml(summary)}</div>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<div style="text-align: center; color: var(--accent-pink);">Error loading summaries: ${err.message}</div>`;
  }
}

// Clear Workspace
async function clearWorkspace() {
  if (!confirm("Are you sure you want to clear all uploaded documents and reset the RAG database?")) return;

  try {
    const res = await fetch("/api/clear", { method: "DELETE" });
    const data = await res.json();
    alert(data.message);
    selectedFiles = [];
    indexedDocuments = {};
    renderSelectedFiles();
    document.getElementById("chatHistory").innerHTML = `
      <div class="chat-message bot">
        <div class="avatar bot">🤖</div>
        <div class="message-bubble">Workspace cleared! Upload new PPTs or PDFs to begin.</div>
      </div>
    `;
  } catch (err) {
    alert(`Clear error: ${err.message}`);
  }
}

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
