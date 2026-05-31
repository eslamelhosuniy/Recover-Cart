from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class StoreBase(BaseModel):
    store_name: str
    salla_store_id: Optional[str] = None
    salla_webhook_secret: Optional[str] = None
    whatsapp_phone_id: Optional[str] = None
    whatsapp_access_token: Optional[str] = None
    whatsapp_webhook_verify_token: Optional[str] = None
    whatsapp_template_name: str = "hello_world"
    coupon_code: Optional[str] = None
    automation_enabled: bool = True
    reminder_delay_hours: int = 1
    max_retries: int = 3
    shipment_review_enabled: bool = True
    shipment_review_delay_hours: int = 24
    shipment_review_template_name: str = "shipment_review"
    is_active: bool = True

class StoreCreate(StoreBase):
    pass

class StoreUpdate(BaseModel):
    store_name: Optional[str] = None
    salla_store_id: Optional[str] = None
    salla_webhook_secret: Optional[str] = None
    whatsapp_phone_id: Optional[str] = None
    whatsapp_access_token: Optional[str] = None
    whatsapp_webhook_verify_token: Optional[str] = None
    whatsapp_template_name: Optional[str] = None
    coupon_code: Optional[str] = None
    automation_enabled: Optional[bool] = None
    reminder_delay_hours: Optional[int] = None
    max_retries: Optional[int] = None
    shipment_review_enabled: Optional[bool] = None
    shipment_review_delay_hours: Optional[int] = None
    shipment_review_template_name: Optional[str] = None
    is_active: Optional[bool] = None

class StoreResponse(StoreBase):
    id: UUID
    owner_id: UUID
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
