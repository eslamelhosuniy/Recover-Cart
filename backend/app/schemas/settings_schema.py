from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class SettingsBase(BaseModel):
    store_name: Optional[str] = None
    salla_api_key: Optional[str] = None
    whatsapp_phone_id: Optional[str] = None
    automation_enabled: Optional[bool] = True
    reminder_delay_hours: Optional[int] = 1
    max_retries: Optional[int] = 3

class SettingsCreate(SettingsBase):
    store_name: str
    salla_api_key: str
    whatsapp_phone_id: str

class SettingsUpdate(SettingsBase):
    pass

class SettingsResponse(SettingsBase):
    id: UUID
    store_name: str
    salla_api_key: str
    whatsapp_phone_id: str

    class Config:
        from_attributes = True
