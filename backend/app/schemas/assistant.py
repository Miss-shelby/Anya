from typing import List, Literal, Optional
from pydantic import BaseModel, Field

AssistantIntent = Literal[
    "general_conversation",
    "naira_detection",
    "object_recognition",
    "text_reading",
    "send_message",
    "make_call",
    "banking_balance",
    "banking_transactions",
    "smartphone_guidance",
]


class TranscribeResponse(BaseModel):
    transcript: str = Field(..., description="Transcribed text from the user's speech")
    detected_language: str = Field(
        default="en-NG",
        description="Detected language code: en-NG, pcm, ig, or yo",
    )
    confidence_note: Optional[str] = Field(
        default=None,
        description="Optional note if audio was faint, noisy, or unclear",
    )


class ConversationTurn(BaseModel):
    role: Literal["user", "assistant"]
    text: str


class ConverseRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    preferred_language: str = Field(default="en-NG")
    history: List[ConversationTurn] = Field(default_factory=list)


class IntentEntities(BaseModel):
    recipient: Optional[str] = Field(default=None, description="Contact name or phone number")
    message_body: Optional[str] = Field(default=None, description="Drafted message text")
    setting_name: Optional[str] = Field(default=None, description="Phone setting name like Wi-Fi")


class StructuredIntentResponse(BaseModel):
    intent: AssistantIntent
    language: str = Field(default="en-NG")
    requires_camera: bool = False
    requires_confirmation: bool = False
    reply: str = Field(
        ...,
        description="Clear, concise, spoken-friendly response for a blind or low-vision user",
    )
    entities: IntentEntities = Field(
        default_factory=IntentEntities,
        description="Optional extracted values like recipient, message_body, or setting_name",
    )
    suggested_route: Optional[str] = Field(
        default=None,
        description="Frontend route if a specialized screen handles this intent",
    )


class VoiceCommandResponse(StructuredIntentResponse):
    transcript: str = Field(
        default="",
        description="Accurate transcription of what the user said in their original language (en-NG, pcm, ig, or yo)",
    )
