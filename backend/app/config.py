from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Dict

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    app_env: str = "development"
    app_secret_key: str
    accepted_events: Dict[str, str] = {
        "abandoned.cart.updated": "recover_salla",
        "abandoned.cart": "recover_salla"
    }

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", populate_by_name=True)

settings = Settings()
