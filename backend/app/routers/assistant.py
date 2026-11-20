from fastapi import APIRouter, HTTPException

from app.schemas.assistant import ConverseRequest, StructuredIntentResponse
from app.services.intent_service import process_conversation_turn

router = APIRouter(prefix="/api/assistant", tags=["assistant"])


@router.post("/converse", response_model=StructuredIntentResponse)
async def converse_with_anya(payload: ConverseRequest):
    try:
        return process_conversation_turn(payload)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Assistant request failed: {str(exc)}",
        ) from exc
