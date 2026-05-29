from pydantic import BaseModel
from typing import Optional, List
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from app.schemas.customer_schema import CustomerResponse
from app.schemas.message_schema import MessageResponse
from app.schemas.recovered_cart_schema import RecoveredCartResponse

class CartBase(BaseModel):
    salla_cart_id: str
    cart_value: Decimal
    event_type: str = "order.abandoned"
    checkout_url: Optional[str] = None
class CartCreate(CartBase):
    customer_id: UUID
    abandoned_at: datetime

class CartResponse(CartBase):
    id: UUID
    customer_id: UUID
    reminder_sent: bool
    is_recovered: bool
    abandoned_at: Optional[datetime] = None
    recovered_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    customer: Optional[CustomerResponse] = None
    messages: Optional[List[MessageResponse]] = []
    recovered_details: Optional[RecoveredCartResponse] = None

    model_config = {"from_attributes": True}