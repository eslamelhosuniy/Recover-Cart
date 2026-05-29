from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from uuid import UUID
from datetime import datetime

class EmailSettingCreate(BaseModel):
    sendgrid_api_key: Optional[str] = None
    sendgrid_default_list_id: Optional[str] = None
    from_email: Optional[EmailStr] = None
    from_name: Optional[str] = None
    is_active: bool = False

class EmailSettingResponse(EmailSettingCreate):
    id: UUID
    store_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class EmailContactCreate(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    custom_attributes: Optional[Dict[str, Any]] = None
    list_id: Optional[str] = None
    is_subscribed: bool = True

class EmailCampaignCreate(BaseModel):
    name: str
    subject: str
    html_content: str = ""
    sender_id: int
    list_id: str
    suppression_group_id: Optional[int] = None
    custom_unsubscribe_url: Optional[str] = None

class SingleEmailSend(BaseModel):
    to_email: EmailStr
    subject: str
    html_content: str
    from_name: Optional[str] = None

class EmailListCreate(BaseModel):
    name: str

class SuppressionGroupCreate(BaseModel):
    name: str
    description: str
    is_default: bool = False
