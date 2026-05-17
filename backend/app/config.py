from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    event_name: str = Field(default="abandoned.cart.updated", alias="SALLA_EVENT_NAME")
    app_env: str = "development"
    app_secret_key: str

    def set_event_name(self, name: str):
        """Setter to change event_name at runtime"""
        self.event_name = name

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", populate_by_name=True)

settings = Settings()
