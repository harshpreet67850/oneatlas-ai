# 🚀 OneAtlas AI — AI Native App Generator

OneAtlas AI is a full-stack AI pipeline that converts natural language prompts into structured application architecture, backend logic, and frontend UI design.

---

## 📌 Project Overview

This project is a prototype AI system that:

- Accepts user prompts
- Breaks them into structured intent
- Generates application architecture
- Supports multi-model routing (OpenAI, Claude, Groq, DeepSeek, Gemini, OpenRouter)
- Builds scalable full-stack app blueprints

---

## 🏗️ Tech Stack

### Backend
- Node.js
- Express.js
- TypeScript
- Multi-LLM Routing Engine

### Frontend
- Next.js
- React.js

---

## 📁 Project Structure


backend/ → AI pipeline API (Express + TS)
frontend/ → UI (Next.js)
src/ → Core logic modules


---

## ⚙️ Installation

### 1. Clone repo

git clone https://github.com/harshpreet67850/oneatlas-ai.git
cd oneatlas-ai


---

### 2. Backend Setup


cd backend
npm install
npm run dev


Backend runs on:

http://localhost:4000


---

### 3. Frontend Setup


cd frontend
npm install
npm run dev


Frontend runs on:

http://localhost:3000


---

## 🔌 API Endpoints

### Generate App

POST /api/generate


### Get Job Status

GET /api/generate/:jobId


### Stream Output

GET /api/generate/:jobId/stream


---

## 🧠 Features

- Multi-model AI routing system
- Job-based async generation
- Structured app intent extraction
- Scalable backend architecture
- Real-time status tracking
- Frontend dashboard UI

---

## ⚠️ Notes

- Ensure `.env` contains all API keys:
  - OPENAI_API_KEY
  - CLAUDE_API_KEY
  - GROQ_API_KEY
  - DEEPSEEK_KEY
  - GEMINI_KEY
  - OPENROUTER_API_KEY

- Backend runs on port `4000`
- Frontend runs on port `3000`

---

## 🚀 Future Improvements

- UI builder (drag & drop)
- Database schema generator
- Full code export system
- Deployment automation
- Authentication system

---

## 👨‍💻 Author

Harshpreet Kaur
