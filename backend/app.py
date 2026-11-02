"""
Convenience entrypoint alias for running `uvicorn app:app --reload` inside the backend directory.
Delegates directly to `backend.main.app`.
"""
import sys
from pathlib import Path

_dir = Path(__file__).resolve().parent
if str(_dir) not in sys.path:
    sys.path.insert(0, str(_dir))

from main import app

__all__ = ["app"]

