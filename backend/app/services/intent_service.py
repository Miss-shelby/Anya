import json
from google.genai import types

from app.config import settings
from app.prompts.intent_prompt import SYSTEM_INTENT_PROMPT
from app.schemas.assistant import (
    ConverseRequest,
    ConversationTurn,
    StructuredIntentResponse,
    VoiceCommandResponse,
)
from app.services.banking_sim import get_demo_account, get_demo_banking_summary
from app.services.gemini_client import generate_content_with_fallback

INTENT_ROUTE_MAP = {
    "naira_detection": "/naira",
    "object_recognition": "/objects",
    "text_reading": "/read",
    "send_message": "/communicate",
    "make_call": "/communicate",
    "banking_balance": "/banking",
    "banking_transactions": "/banking",
    "smartphone_guidance": None,
    "general_conversation": None,
}


def process_conversation_turn(payload: ConverseRequest) -> StructuredIntentResponse:
    # Keep recent session context concise (last 8 turns)
    recent_history = payload.history[-8:]
    history_lines = [
        f"{'User' if turn.role == 'user' else 'ANYA'}: {turn.text}"
        for turn in recent_history
    ]
    history_block = "\n".join(history_lines) if history_lines else "No previous messages."

    user_prompt = (
        f"Preferred language: {payload.preferred_language}\n"
        f"Recent session conversation:\n{history_block}\n\n"
        f"Current user message: {payload.message}"
    )

    response = generate_content_with_fallback(
        contents=user_prompt,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INTENT_PROMPT,
            response_mime_type="application/json",
            response_schema=StructuredIntentResponse,
            temperature=0.3,
        ),
    )

    raw_text = (response.text or "").strip()
    parsed = json.loads(raw_text)
    result = StructuredIntentResponse.model_validate(parsed)

    # Enforce deterministic route mapping and safety flags
    result.suggested_route = INTENT_ROUTE_MAP.get(result.intent)
    if result.intent in ("naira_detection", "object_recognition", "text_reading"):
        result.requires_camera = True
    if result.intent in ("send_message", "make_call"):
        result.requires_confirmation = True
    if result.intent == "banking_balance":
        result.reply = get_demo_account().spoken_balance
    elif result.intent == "banking_transactions":
        result.reply = get_demo_banking_summary().spoken_transactions_summary

    return result


def process_voice_command(
    audio_bytes: bytes,
    mime_type: str = "audio/webm",
    preferred_language: str = "en-NG",
    history: list[ConversationTurn] | None = None,
) -> VoiceCommandResponse:
    """
    Single-shot multimodal voice command: transcribes Nigerian English / Pidgin / Igbo / Yoruba
    AND classifies intent + generates spoken reply in ONE fast Gemini call.
    Raw audio is processed in memory and never stored.
    """
    if not audio_bytes:
        return VoiceCommandResponse(
            transcript="",
            intent="general_conversation",
            language=preferred_language,
            reply="I did not hear anything clearly. Say Anya and try speaking again.",
        )

    recent_history = (history or [])[-6:]
    history_lines = [
        f"{'User' if turn.role == 'user' else 'ANYA'}: {turn.text}"
        for turn in recent_history
    ]
    history_block = "\n".join(history_lines) if history_lines else "No previous messages."

    prompt = (
        f"Listen to the user's audio carefully.\n"
        f"1. Put their exact words in `transcript` (do not translate Pidgin, Igbo, or Yoruba).\n"
        f"2. If the audio is silent or unintelligible, set `transcript` to \"\" and politely ask them to repeat.\n"
        f"3. Otherwise classify their intent and write a short, natural spoken `reply`.\n"
        f"Preferred language hint: {preferred_language}\n"
        f"Recent session conversation:\n{history_block}"
    )

    response = generate_content_with_fallback(
        contents=[
            types.Part.from_bytes(data=audio_bytes, mime_type=mime_type),
            prompt,
        ],
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_INTENT_PROMPT,
            response_mime_type="application/json",
            response_schema=VoiceCommandResponse,
            temperature=0.2,
        ),
    )

    raw_text = (response.text or "").strip()
    parsed = json.loads(raw_text)
    result = VoiceCommandResponse.model_validate(parsed)

    result.suggested_route = INTENT_ROUTE_MAP.get(result.intent)
    if result.intent in ("naira_detection", "object_recognition", "text_reading"):
        result.requires_camera = True
    if result.intent in ("send_message", "make_call"):
        result.requires_confirmation = True
    if result.intent == "banking_balance":
        result.reply = get_demo_account().spoken_balance
    elif result.intent == "banking_transactions":
        result.reply = get_demo_banking_summary().spoken_transactions_summary

    return result
