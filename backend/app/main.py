from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import assistant, banking, vision, voice

app = FastAPI(
    title="ANYA — AI-Powered Accessibility Companion API",
    description="Backend API for voice transcription, intent routing, Naira detection, vision, and simulated banking.",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(voice.router)
app.include_router(assistant.router)
app.include_router(vision.router)
app.include_router(banking.router)


@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "service": "anya-backend",
        "gemini_configured": bool(
            settings.gemini_api_key and settings.gemini_api_key != "your_gemini_api_key_here"
        ),
        "model": settings.gemini_model,
    }
