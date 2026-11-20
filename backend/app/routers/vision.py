from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.schemas.vision import (
    NairaDetectionResponse,
    ObjectRecognitionResponse,
    TextReadingResponse,
)
from app.services.vision_service import (
    detect_naira_in_image,
    read_text_in_image,
    recognize_objects_in_image,
)

router = APIRouter(prefix="/api/vision", tags=["vision"])

MAX_IMAGE_BYTES = 12 * 1024 * 1024  # 12 MB safety limit


async def _read_validated_image(image: UploadFile) -> bytes:
    raw_bytes = await image.read()
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="No image was uploaded.")
    if len(raw_bytes) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Image file is too large.")
    return raw_bytes


@router.post("/naira", response_model=NairaDetectionResponse)
async def analyze_naira(
    image: UploadFile = File(...),
    preferred_language: str = Form("en-NG"),
):
    raw_bytes = await _read_validated_image(image)
    try:
        return detect_naira_in_image(
            raw_bytes=raw_bytes,
            preferred_language=preferred_language,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Naira detection failed: {str(exc)}",
        ) from exc


@router.post("/objects", response_model=ObjectRecognitionResponse)
async def analyze_objects(
    image: UploadFile = File(...),
    question: str = Form("What is in front of me?"),
    preferred_language: str = Form("en-NG"),
):
    raw_bytes = await _read_validated_image(image)
    try:
        return recognize_objects_in_image(
            raw_bytes=raw_bytes,
            question=question,
            preferred_language=preferred_language,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Object recognition failed: {str(exc)}",
        ) from exc


@router.post("/read-text", response_model=TextReadingResponse)
async def analyze_text(
    image: UploadFile = File(...),
    preferred_language: str = Form("en-NG"),
):
    raw_bytes = await _read_validated_image(image)
    try:
        return read_text_in_image(
            raw_bytes=raw_bytes,
            preferred_language=preferred_language,
        )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Text recognition failed: {str(exc)}",
        ) from exc
