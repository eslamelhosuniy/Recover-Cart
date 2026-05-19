from sqlalchemy import Column, String, Numeric, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

class RecoveredCart(Base):
    __tablename__ = "recovered_carts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cart_id = Column(UUID(as_uuid=True), ForeignKey("abandoned_carts.id"), unique=True, nullable=False)
    status = Column(String, default="purchased", nullable=False)
    currency = Column(String, default="SAR", nullable=False)
    total = Column(Numeric(10, 2), nullable=False)
    subtotal = Column(Numeric(10, 2), nullable=False)
    total_discount = Column(Numeric(10, 2), default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationship to parent AbandonedCart (backref is defined in AbandonedCart)
