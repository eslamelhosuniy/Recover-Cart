from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str
    redis_url: str
    salla_webhook_secret: str
    whatsapp_token: str
    whatsapp_phone_number_id: str
    whatsapp_template_name: str = "abandoned_cart_reminder"
    coupon_code: str = ""
    event_name: str = Field(default="abandoned.cart.updated", alias="SALLA_EVENT_NAME")
    app_env: str = "development"
    app_secret_key: str
    reminder_delay_hours: int = 1

    def set_event_name(self, name: str):
        """Setter to change event_name at runtime"""
        self.event_name = name

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", populate_by_name=True)

settings = Settings()
