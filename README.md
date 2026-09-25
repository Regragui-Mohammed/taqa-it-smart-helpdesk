<p align="center">
  <img src="assets/logo_taqa.png" alt="TAQA Morocco Logo" width="180">
</p> 

<h1 align="center"> TAQA IT Smart Helpdesk</h1>

<p align="center">
  <em>An intelligent, enterprise-grade IT Service Management (ITSM) and Helpdesk automation platform designed for TAQA Morocco.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Frontend-React_18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Backend-Python_Flask-000000?style=for-the-badge&logo=flask&logoColor=white" alt="Flask" />
  <img src="https://img.shields.io/badge/AI-LLaMA_3.2-0467DF?style=for-the-badge" alt="LLaMA 3.2" />
  <img src="https://img.shields.io/badge/NLP-spaCy-09A3D5?style=for-the-badge&logo=spacy&logoColor=white" alt="spaCy" />
</p>

---

## 📖 Overview 
This project is an advanced, automated IT helpdesk solution that streamlines support requests. It utilizes cutting-edge Machine Learning and Natural Language Processing to instantly classify tickets, retrieve solutions from a proprietary Knowledge Base, and generate human-like, accurate responses for TAQA's employees.

## 🏗️ Modern Architecture
Built entirely on a decoupled architecture for maximum performance and 100% data privacy:
*   **Frontend:** Modern React 18 + Vite (featuring a dynamic Split-Screen UI and Floating Chatbot Widget).
*   **Backend:** High-performance Python Flask REST API.
*   **Classification Engine:** Machine Learning pipeline using `MultiOutput LinearSVC` + `TF-IDF` alongside a `spaCy` NLP Preprocessing Pipeline.
*   **Knowledge Base:** 162-article proprietary English SOPs integrated via deterministic retrieval.
*   **Generative AI (RAG):** Local Large Language Model (LLaMA 3.2 via Ollama) ensuring zero data leakage outside the corporate network.

## ✨ Key Features
- 🤖 **Auto-Triage (Zero Touch):** Automatically assigns Categories, Subcategories, and Priority levels to incoming IT tickets.
- 💬 **Smart Chatbot:** A responsive widget that understands natural language and provides step-by-step IT resolutions.
- 🔒 **100% Air-Gapped AI:** All LLM processing is executed locally. No sensitive corporate data is sent to external APIs (like OpenAI or Anthropic).
- 📊 **Enterprise UI:** A custom, TAQA-branded interface designed for intuitive employee self-service.

## 🚀 Installation & Setup

### 1. Prerequisites
- Node.js & npm
- Python 3.9+
- [Ollama](https://ollama.com/) installed locally.

An intelligent, enterprise-grade IT Service Management (ITSM) and Helpdesk automation platform designed for **TAQA Morocco**.  
Built entirely on a **Modern React 18 + Vite Frontend** coupled with a high-performance **Python Flask REST API Backend**, backed by **Machine Learning (MultiOutput LinearSVC + TF-IDF)**, a **spaCy NLP Preprocessing Pipeline**, a **162-article English Knowledge Base**, and a **Local Large Language Model (LLaMA 3.2 via Ollama)**.

---

## 📁 Project Architecture

```text
taqa-it-smart-helpdesk/
│
├── frontend/                       # Modern React 18 + Vite Single Page Application
│   ├── src/
│   │   ├── components/             # Navbar, ChatWidget (Sara), TicketTable, TicketForm, StatusBadge...
│   │   ├── pages/                  # LoginPage, EmployeeDashboard, SupportDashboard
│   │   ├── context/                # AuthContext (Role-based authentication)
│   │   ├── services/               # api.js (Axios / Fetch client)
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css               # Modern glassmorphism & corporate styling
│   ├── package.json
│   └── vite.config.js
│
├── server.py                       # Modern Flask REST API Backend (Port 5000)
│
├── data/
│   ├── raw/                        # Raw files (CSV / GLPI exports / initial incident dumps)
│   │   ├── tickets_raw.csv
│   │   ├── glpi_export.csv
│   │   └── glpi_tickets_full.csv
│   └── processed/                  # Anonymized, preprocessed clean tickets
│       ├── data_clean.csv
│       └── tickets_support.csv
│
├── models/
│   ├── ticket_pipeline.pkl         # End-to-end TF-IDF + MultiOutputClassifier Pipeline
│   ├── model_TAQA.pkl              # MultiOutputClassifier (LinearSVC) model
│   ├── vect_ticket.pkl             # Fitted TfidfVectorizer (5,000 features, n-grams)
│   └── knowledge_base.json         # 162 structured IT resolution procedures (JSON)
│
├── src/
│   ├── __init__.py                 # Core package exports
│   ├── cleanup.py                  # PII anonymization, text normalization, and spaCy pipeline
│   ├── model.py                    # Scikit-Learn training, GridSearchCV tuning, and export
│   └── utils.py                    # Deterministic KB matching, Ollama LLaMA integration, and escalation
│
├── assets/
│   └── logo_taqa.png               # Official TAQA corporate visual identity logo
│
├── run_project.bat                 # One-click launcher for Windows (Backend + Frontend)
├── requirements.txt                # Production Python dependencies (Flask, spaCy, scikit-learn...)
├── .gitignore                      # Git exclusion rules for node_modules, cache, models...
└── README.md                       # Complete technical documentation
```

---

## 🚀 Key Modern Features

### 1. ⚛️ Modern React 18 Frontend (`frontend/`)
- **Fast Build & HMR**: Powered by Vite (sub-second reloads).
- **Role-Based Views**:
  - **Employee Portal**: Live metrics, interactive ticket submission with real-time AI classification preview, personal ticket tracking table, and embedded Sara Chatbot widget.
  - **Support Dashboard**: Queue management for IT technicians with filtering by Assigned Team (*Desktop Support*, *Network Team*, *Security Team*, *Application Support*), status toggling (*In Progress*, *Resolved*, *Closed*), and SLA indicators.
  - **Authentication**: Seamless login supporting Employee and Support Engineer roles.
- **Glassmorphism & Corporate Aesthetics**: Custom CSS system tailored with TAQA’s brand palette (`#0A2540`, `#00A3E0`, `#0D3E66`).

### 2. 💬 Sara — Intelligent IT Assistant (`ChatWidget.jsx`)
- **Deterministic Knowledge Base Search**: Searches 162 verified IT solutions with word-boundary regex scoring and semantic title overlap.
- **Conversational Step-by-Step Guidance**: Formulated by local Ollama `llama3.2` with strict 12s timeout and formatting fallback.
- **Automatic Incident Dispatch**: If an issue has no self-service procedure in the knowledge base, Sara automatically registers an IT ticket assigned to the predicted support team.

### 3. 🤖 High-Accuracy Machine Learning (`src/model.py`)
- **Multi-Output Prediction**: Simultaneously classifies both **Category** and **Assigned Team** with **98.52% accuracy** (F1-score = 0.99).
- **spaCy NLP Preprocessing (`src/cleanup.py`)**: Automatic PII anonymization (masking emails, phones, IDs) and English lemmatization.

### 4. 📚 162 Verified IT Solutions (`models/knowledge_base.json`)
- Fully translated to English and expanded across:
  - **Desktop Support**: 63 solutions
  - **Application Support & SAP**: 53 solutions
  - **Security Team**: 25 solutions
  - **Network Team**: 21 solutions

---

## ⚡ Quickstart — How to Run

### Method 1: One-Click Launcher (Windows)
Double-click:
```bash
run_project.bat
```
This automatically starts the Flask Backend, the React Frontend, and opens `http://localhost:5173` in your browser.

---

### Method 2: Manual Terminal Commands

#### Step 1: Start the Backend (Flask API)
```bash
cd taqa-it-smart-helpdesk
py server.py
```
*(Runs on `http://localhost:5000`)*

#### Step 2: Start the Frontend (React Vite)
In a second terminal:
```bash
cd taqa-it-smart-helpdesk/frontend
npm run dev
```
*(Open your browser at `http://localhost:5173`)*

---

## 🛠️ CLI Utilities

### Re-clean Raw Tickets with spaCy
```bash
python src/cleanup.py --input data/raw/glpi_tickets_full.csv --output data/processed/data_clean.csv
```

### Re-train Machine Learning Models
```bash
python src/model.py --data data/processed/data_clean.csv --output models/
```
