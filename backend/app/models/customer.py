from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

class Customer(Base):
    __tablename__ = "customers"
    __table_args__ = (UniqueConstraint('salla_customer_id', 'store_id', name='uq_customer_store'),)

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False)
    salla_customer_id = Column(String, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    mobile = Column(String, nullable=False)
    mobile_code = Column(String, nullable=False)
    email = Column(String, nullable=True)
    total_carts = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    carts = relationship("AbandonedCart", back_populates="customer", cascade="all, delete-orphan")
    shipment_reviews = relationship("ShipmentReview", back_populates="customer", cascade="all, delete-orphan")

