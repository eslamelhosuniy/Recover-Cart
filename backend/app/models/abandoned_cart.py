from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

class AbandonedCart(Base):
    __tablename__ = "abandoned_carts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    salla_cart_id = Column(String, unique=True, index=True, nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False)
    cart_value = Column(Numeric(10, 2), nullable=False)
    event_type = Column(String, default="order.abandoned", nullable=False)
    reminder_sent = Column(Boolean, default=False)
    is_recovered = Column(Boolean, default=False)
    abandoned_at = Column(DateTime(timezone=True), nullable=False)
    recovered_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    customer = relationship("Customer", back_populates="carts")
    messages = relationship("MessageLog", back_populates="cart", cascade="all, delete-orphan")
