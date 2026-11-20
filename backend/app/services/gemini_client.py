from fastapi import HTTPException
from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.config import settings

FALLBACK_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.1-flash-lite",
    "gemini-3.8-flash",
]


def get_gemini_client() -> genai.Client:
    api_key = (settings.gemini_api_key or "").strip()
    if not api_key or api_key == "your_gemini_api_key_here":
        raise HTTPException(
            status_code=503,
            detail=(
                "Gemini API key is not configured on the backend. "
                "Add GEMINI_API_KEY in backend/.env and restart the backend server."
            ),
        )
    return genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(
            timeout=12000,
            retry_options=types.HttpRetryOptions(attempts=1),
        ),
    )


def generate_content_with_fallback(*, contents, config):
    """
    Calls Gemini starting with settings.gemini_model and fails over immediately
    (<1s per 503) across available Flash and Flash-Lite models during demand spikes.
    """
    client = get_gemini_client()
    candidates = [settings.gemini_model] + [
        m for m in FALLBACK_MODELS if m != settings.gemini_model
    ]

    last_error = None
    for model_name in candidates:
        try:
            return client.models.generate_content(
                model=model_name,
                contents=contents,
                config=config,
            )
        except (genai_errors.ServerError, genai_errors.APIError) as exc:
            last_error = exc
            code = getattr(exc, "code", None)
            if code in (404, 429, 500, 503, 504):
                continue
            raise

    raise last_error
