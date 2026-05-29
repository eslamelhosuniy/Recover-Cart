from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class MessageBase(BaseModel):
    status: str = "pending"
    channel: str = "whatsapp"


class MessageCreate(MessageBase):
    cart_id: UUID
    whatsapp_msg_id: Optional[str] = None


class MessageResponse(MessageBase):
    id: UUID
    cart_id: UUID
    whatsapp_msg_id: Optional[str] = None
    sent_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}


class MessageStatsResponse(BaseModel):
    total: int
    sent: int
    read: int
    failed: int
    pending: int
