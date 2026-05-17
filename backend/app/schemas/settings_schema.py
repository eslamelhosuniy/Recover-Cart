from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class SettingsBase(BaseModel):
    store_name: Optional[str] = None
    salla_api_key: Optional[str] = None
    whatsapp_phone_id: Optional[str] = None
    whatsapp_access_token: Optional[str] = None
    whatsapp_template_name: Optional[str] = None
    automation_enabled: Optional[bool] = True
    reminder_delay_hours: Optional[int] = 1
    max_retries: Optional[int] = 3

class SettingsCreate(SettingsBase):
    store_name: str
    salla_api_key: str
    whatsapp_phone_id: str
    whatsapp_access_token: str
    whatsapp_template_name: str

class SettingsUpdate(SettingsBase):
    pass

class EventNameUpdate(BaseModel):
    event_name: str

class SettingsResponse(SettingsBase):
    id: UUID
    user_id: UUID
    store_name: str
    salla_api_key: str
    whatsapp_phone_id: str
    whatsapp_access_token: str
    whatsapp_template_name: str

    class Config:
        from_attributes = True
