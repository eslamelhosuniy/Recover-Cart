from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    salla_webhook_secret: str
    whatsapp_token: str
    whatsapp_phone_number_id: str
    whatsapp_template_name: str = "abandoned_cart_reminder"
    app_env: str = "development"
    app_secret_key: str
    reminder_delay_hours: int = 1

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

settings = Settings()
