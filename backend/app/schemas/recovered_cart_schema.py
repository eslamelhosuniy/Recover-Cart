from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from uuid import UUID

class RecoveredCartResponse(BaseModel):
    id: UUID
    status: str
    currency: str
    total: float
    subtotal: float
    total_discount: float
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True
