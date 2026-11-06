import os
from pydantic import BaseModel

class Settings(BaseModel):
    PROJECT_NAME: str = "Medication Adherence Intelligence Platform (MAIP)"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-production-grade-key-maip-hackathon-2026")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day for demo convenience (production 15m)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./maip.db")
    INVITE_TTL_HOURS: int = 24 * 7  # 7 days
    CORS_ORIGINS: list[str] = ["*"]
    SIMULATION_ENABLED: bool = True

settings = Settings()
