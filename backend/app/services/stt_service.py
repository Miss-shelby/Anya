import json
from google.genai import types

from app.prompts.intent_prompt import TRANSCRIPTION_PROMPT
from app.schemas.assistant import TranscribeResponse
from app.services.gemini_client import generate_content_with_fallback


def transcribe_audio_bytes(
    audio_bytes: bytes,
    mime_type: str = "audio/webm",
    preferred_language: str = "en-NG",
) -> TranscribeResponse:
    """
    Transcribes audio bytes in memory using Gemini multimodal audio understanding.
    Raw audio is never written to disk.
    """
    if not audio_bytes:
        return TranscribeResponse(
            transcript="",
            detected_language=preferred_language,
            confidence_note="No audio was captured. Please try speaking again.",
        )

    response = generate_content_with_fallback(
        contents=[
            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
            f"{TRANSCRIPTION_PROMPT}\nUser's preferred language hint: {preferred_language}",
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=TranscribeResponse,
            temperature=0.1,
        ),
    )

    raw_text = (response.text or "").strip()
    if not raw_text:
        return TranscribeResponse(
            transcript="",
            detected_language=preferred_language,
            confidence_note="Could not understand the audio clearly. Please try again.",
        )

    parsed = json.loads(raw_text)
    return TranscribeResponse.model_validate(parsed)
