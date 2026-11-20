import io
import json
from fastapi import HTTPException
from google.genai import types
from PIL import Image, ImageOps

from app.config import settings
from app.prompts.naira_prompt import NAIRA_DETECTION_PROMPT
from app.prompts.object_prompt import OBJECT_RECOGNITION_PROMPT
from app.prompts.text_prompt import TEXT_READING_PROMPT
from app.schemas.vision import (
    NairaDetectionResponse,
    ObjectRecognitionResponse,
    TextReadingResponse,
)
from app.services.gemini_client import generate_content_with_fallback

MAX_IMAGE_DIMENSION = 1280


def prepare_image_bytes(raw_bytes: bytes) -> tuple[bytes, str]:
    """
    Validates and normalizes an uploaded image in memory (auto-orient, resize if huge, JPEG encode).
    Images are never written to disk.
    """
    try:
        with Image.open(io.BytesIO(raw_bytes)) as img:
            img = ImageOps.exif_transpose(img)
            if img.mode != "RGB":
                img = img.convert("RGB")

            if max(img.size) > MAX_IMAGE_DIMENSION:
                img.thumbnail((MAX_IMAGE_DIMENSION, MAX_IMAGE_DIMENSION))

            out = io.BytesIO()
            img.save(out, format="JPEG", quality=88)
            return out.getvalue(), "image/jpeg"
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail="Invalid image file. Please capture or upload a valid photo.",
        ) from exc


def detect_naira_in_image(
    raw_bytes: bytes,
    preferred_language: str = "en-NG",
) -> NairaDetectionResponse:
    image_bytes, mime_type = prepare_image_bytes(raw_bytes)
    response = generate_content_with_fallback(
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            f"{NAIRA_DETECTION_PROMPT}\nUser's preferred language code: {preferred_language}",
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=NairaDetectionResponse,
            temperature=0.1,
        ),
    )

    raw_text = (response.text or "").strip()
    if not raw_text:
        return NairaDetectionResponse(
            is_naira_detected=False,
            is_uncertain=True,
            notes=[],
            total_amount=0,
            spoken_summary="I could not analyze that photo clearly. Please retake the photo in good lighting.",
            retake_guidance="Hold the camera steady above the notes in brighter lighting and try again.",
        )

    parsed = json.loads(raw_text)
    result = NairaDetectionResponse.model_validate(parsed)

    # Deterministic arithmetic recalculation to prevent any total mismatch
    computed_total = 0
    for note in result.notes:
        note.subtotal = note.denomination * note.count
        computed_total += note.subtotal
    result.total_amount = computed_total

    if computed_total == 0:
        result.is_naira_detected = False

    return result


def recognize_objects_in_image(
    raw_bytes: bytes,
    question: str = "What is in front of me?",
    preferred_language: str = "en-NG",
) -> ObjectRecognitionResponse:
    image_bytes, mime_type = prepare_image_bytes(raw_bytes)
    response = generate_content_with_fallback(
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            (
                f"{OBJECT_RECOGNITION_PROMPT}\n"
                f"User's preferred language code: {preferred_language}\n"
                f"User's question: {question.strip() or 'What is in front of me?'}"
            ),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=ObjectRecognitionResponse,
            temperature=0.2,
        ),
    )

    raw_text = (response.text or "").strip()
    if not raw_text:
        return ObjectRecognitionResponse(
            spoken_summary="I could not see that photo clearly. Please retake it in better lighting.",
            detected_objects=[],
            dominant_colors=[],
            is_uncertain=True,
        )

    parsed = json.loads(raw_text)
    result = ObjectRecognitionResponse.model_validate(parsed)
    result.safety_note = (
        "ANYA provides visual descriptions for orientation only and cannot guarantee "
        "obstacle avoidance or replace a mobility aid."
    )
    return result


def read_text_in_image(
    raw_bytes: bytes,
    preferred_language: str = "en-NG",
) -> TextReadingResponse:
    image_bytes, mime_type = prepare_image_bytes(raw_bytes)
    response = generate_content_with_fallback(
        contents=[
            types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
            f"{TEXT_READING_PROMPT}\nUser's preferred language code: {preferred_language}",
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=TextReadingResponse,
            temperature=0.1,
        ),
    )

    raw_text = (response.text or "").strip()
    if not raw_text:
        return TextReadingResponse(
            has_text=False,
            extracted_text="",
            summary="",
            important_details=[],
            spoken_summary="I could not read any text clearly from that photo. Please retake it closer and in brighter light.",
            is_uncertain=True,
        )

    parsed = json.loads(raw_text)
    return TextReadingResponse.model_validate(parsed)
