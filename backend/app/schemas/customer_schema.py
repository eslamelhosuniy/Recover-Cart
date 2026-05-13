from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class CustomerBase(BaseModel):
    salla_customer_id: str
    full_name: str
    mobile: str
    mobile_code: str
    email: Optional[str] = None
    total_carts: int = 1

class CustomerCreate(CustomerBase):
    pass

class CustomerResponse(CustomerBase):
    id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}
