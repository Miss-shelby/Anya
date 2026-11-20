import json
from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.assistant import (
    ConversationTurn,
    TranscribeResponse,
    VoiceCommandResponse,
)
from app.services.intent_service import process_voice_command
from app.services.stt_service import transcribe_audio_bytes

router = APIRouter(prefix="/api/voice", tags=["voice"])

MAX_AUDIO_BYTES = 10 * 1024 * 1024  # 10 MB safety limit


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_voice(
    audio: UploadFile = File(...),
    preferred_language: str = Form("en-NG"),
):
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio recording is too large.")

    mime_type = (audio.content_type or "audio/webm").split(";")[0].strip()
    try:
        return transcribe_audio_bytes(
            audio_bytes=audio_bytes,
            mime_type=mime_type,
            preferred_language=preferred_language,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Audio transcription failed: {str(exc)}",
        ) from exc


@router.post("/command", response_model=VoiceCommandResponse)
async def voice_command(
    audio: UploadFile = File(...),
    preferred_language: str = Form("en-NG"),
    history: str = Form("[]"),
):
    audio_bytes = await audio.read()
    if len(audio_bytes) > MAX_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="Audio recording is too large.")

    mime_type = (audio.content_type or "audio/webm").split(";")[0].strip()

    parsed_history: list[ConversationTurn] = []
    try:
        raw_list = json.loads(history)
        if isinstance(raw_list, list):
            parsed_history = [ConversationTurn.model_validate(item) for item in raw_list[-6:]]
    except Exception:
        parsed_history = []

    try:
        return process_voice_command(
            audio_bytes=audio_bytes,
            mime_type=mime_type,
            preferred_language=preferred_language,
            history=parsed_history,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Voice command failed: {str(exc)}",
        ) from exc
