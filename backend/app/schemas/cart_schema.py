from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from app.schemas.customer_schema import CustomerResponse

class CartBase(BaseModel):
    salla_cart_id: str
    cart_value: Decimal
    event_type: str = "order.abandoned"

class CartCreate(CartBase):
    customer_id: UUID
    abandoned_at: datetime

class CartResponse(CartBase):
    id: UUID
    customer_id: UUID
    reminder_sent: bool
    is_recovered: bool
    abandoned_at: datetime
    recovered_at: Optional[datetime]
    created_at: datetime
    customer: Optional[CustomerResponse] = None

    model_config = {"from_attributes": True}
