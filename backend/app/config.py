import os
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
        "https://recover-a8a6585e.fastapicloud.dev",
    ]
    accepted_events: Dict[str, str] = {
        "abandoned.cart.update": "recover_salla",
        "abandoned.cart": "recover_salla",
        "abandoned.cart.purchased": "recover_salla",
        "review.added": "review_webhook",
    }

    # default to no env_file here; we'll decide at runtime which file (if any) to load
    model_config = SettingsConfigDict(env_file=None, env_file_encoding="utf-8", populate_by_name=True)


# Load `.env` only during local development. In production, rely on real environment variables.
# This prevents accidentally using the repo's .env (which points to localhost) when deployed.
_env_file = ".env" if os.environ.get("APP_ENV", "development") == "development" else None
settings = Settings(_env_file=_env_file)
