from sqlalchemy import Column, String, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

from sqlalchemy import Column, String, Integer, DateTime, UniqueConstraint

class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (UniqueConstraint('salla_customer_id', 'user_id', name='uq_customer_user'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    salla_customer_id = Column(String, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    mobile = Column(String, nullable=False)
    mobile_code = Column(String, nullable=False)
    email = Column(String, nullable=True)
    total_carts = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    carts = relationship("AbandonedCart", back_populates="customer", cascade="all, delete-orphan")
