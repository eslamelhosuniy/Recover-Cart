from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Dict, List

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    app_env: str = "development"
    app_secret_key: str
    reminder_delay_hours: int = 1
    # Comma-separated list of allowed CORS origins
    allowed_origins: List[str] = [
        "http://localhost:5173",
        "https://recover-a8a6585e.fastapicloud.dev",
       "http://127.0.0.1:8000",
    ]
    accepted_events: Dict[str, str] = {
        "abandoned.cart.updated": "recover_salla",
        "abandoned.cart": "recover_salla"
    }

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", populate_by_name=True)

settings = Settings()
