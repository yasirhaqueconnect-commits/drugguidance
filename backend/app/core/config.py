"""
Application Configuration and Environment Settings.
Loads and validates environment variables using strict type defaults.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Locate and load .env from backend directory or project root
base_dir = Path(__file__).resolve().parent.parent.parent
env_path = base_dir / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()


class Settings:
    PROJECT_NAME: str = "DrugGuide Clinical Assistant RAG API"
    VERSION: str = "2.2.0"
    API_V1_STR: str = "/api"

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")

    # Security & JWT
    JWT_SECRET: str = os.getenv("JWT_SECRET", os.getenv("SECRET_KEY", "super_medical_jwt_secret_key_2026_xyz987"))
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "43200"))

    # Groq Clinical AI
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

    # Server Network
    HOST: str = os.getenv("HOST", "127.0.0.1")
    PORT: int = int(os.getenv("PORT", "8001"))

    @property
    def normalized_database_url(self) -> str:
        url = self.DATABASE_URL
        if not url:
            raise RuntimeError("DATABASE_URL environment variable is missing.")
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+psycopg2://", 1)
        elif url.startswith("postgresql://") and not url.startswith("postgresql+"):
            url = url.replace("postgresql://", "postgresql+psycopg2://", 1)
        return url


settings = Settings()
