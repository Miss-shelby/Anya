import sys
from pathlib import Path

# Ensure backend/ is on Python path when running as a Vercel serverless function
BACKEND_ROOT = str(Path(__file__).resolve().parent.parent)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.main import app  # noqa: E402, F401
