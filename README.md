# ANYA — AI-Powered Accessibility Companion

**Tagline:** *Your world, within reach.*

ANYA is a voice-first, mobile-first AI web companion designed for blind and visually impaired people, with a focus on Nigerian users (Nigerian English, Nigerian Pidgin, Igbo, and Yoruba) and Nigerian Naira currency recognition.

## Project Structure

- `frontend/` — React + TypeScript + Vite + Tailwind CSS mobile-first web application
- `backend/` — Python + FastAPI backend using Google Gemini (`google-genai`)

## Quick Start

### 1. Backend
```powershell
cd backend
copy .env.example .env
# Add your GEMINI_API_KEY inside backend/.env
.\.venv\Scripts\uvicorn.exe app.main:app --reload --port 8000
```

### 2. Frontend
```powershell
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.
