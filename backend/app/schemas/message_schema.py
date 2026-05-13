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
    whatsapp_msg_id: Optional[str]
    sent_at: datetime
    updated_at: datetime
    error_message: Optional[str]

    model_config = {"from_attributes": True}
