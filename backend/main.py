"""
Root Application Gateway & Process Entrypoint.
Provides backward-compatible root exposure for Uvicorn and deployment runners.
"""

import sys
from pathlib import Path

# Ensure backend directory and app package are in sys.path
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.main import app, create_app  # noqa: F401

if __name__ == "__main__":
    import uvicorn
    from app.core.config import settings
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
