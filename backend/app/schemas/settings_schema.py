from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class SettingsBase(BaseModel):
    salla_api_key: Optional[str] = None
    whatsapp_phone_id: Optional[str] = None
    whatsapp_access_token: Optional[str] = None
    whatsapp_template_name: Optional[str] = None
    automation_enabled: Optional[bool] = True

class SettingsCreate(SettingsBase):
    salla_api_key: str
    whatsapp_phone_id: str
    whatsapp_access_token: str
    whatsapp_template_name: str

class SettingsUpdate(SettingsBase):
    pass

class SettingsResponse(SettingsBase):
    id: UUID
    user_id: UUID
    salla_api_key: str
    whatsapp_phone_id: str
    whatsapp_access_token: str
    whatsapp_template_name: str

    class Config:
        from_attributes = True
