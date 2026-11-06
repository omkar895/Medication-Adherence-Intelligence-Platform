import os
from pydantic import BaseModel

def _get_db_url() -> str:
    env_url = os.getenv("DATABASE_URL")
    if env_url:
        return env_url
    if os.getenv("VERCEL"):
        return "sqlite:////tmp/maip.db"
    return "sqlite:///./maip.db"

class Settings(BaseModel):
    PROJECT_NAME: str = "Medication Adherence Intelligence Platform (MAIP)"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-production-grade-key-maip-hackathon-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day for demo convenience (production 15m)
    DATABASE_URL: str = _get_db_url()
    INVITE_TTL_HOURS: int = 24 * 7  # 7 days
    CORS_ORIGINS: list[str] = ["*"]
    SIMULATION_ENABLED: bool = True

settings = Settings()

