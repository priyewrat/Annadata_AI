import sys
from pathlib import Path

# Automatically add the backend directory to sys.path so subpackages
# (data, schemas, services, utils) can be imported directly.
_BACKEND_DIR = Path(__file__).resolve().parent
if str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

