from pydantic import BaseModel
from typing import Optional
from uuid import UUID

class SettingsBase(BaseModel):
    salla_webhook_secret: Optional[str] = None
    whatsapp_phone_id: Optional[str] = None
    whatsapp_access_token: Optional[str] = None
    whatsapp_template_name: Optional[str] = None
    automation_enabled: Optional[bool] = True
    coupon_code: Optional[str] = None

class SettingsCreate(SettingsBase):
    salla_webhook_secret: str
    whatsapp_phone_id: str
    whatsapp_access_token: str
    whatsapp_template_name: str
    coupon_code: str

class SettingsUpdate(SettingsBase):
    pass

class SettingsResponse(SettingsBase):
    id: UUID
    user_id: UUID
    salla_webhook_secret: str
    whatsapp_phone_id: str
    whatsapp_access_token: str
    whatsapp_template_name: str
    coupon_code: Optional[str] = None

    class Config:
        from_attributes = True
