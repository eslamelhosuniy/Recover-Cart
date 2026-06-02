from sqlalchemy import Column, String, Integer, Boolean, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base


class Store(Base):
    __tablename__ = "stores"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    store_name = Column(String, nullable=False)
    salla_store_id = Column(String, unique=True, index=True, nullable=True)
    salla_webhook_secret = Column(String, nullable=True)
    whatsapp_phone_id = Column(String, nullable=True)
    whatsapp_access_token = Column(String, nullable=True)
    whatsapp_webhook_verify_token = Column(String, nullable=True)
    whatsapp_template_name = Column(String, nullable=False, default="hello_world")
    coupon_code = Column(String, nullable=True)
    automation_enabled = Column(Boolean, default=True, nullable=False)
    reminder_delay_hours = Column(Integer, default=1, nullable=False)
    max_retries = Column(Integer, default=3, nullable=False)
    review_request_enabled = Column(Boolean, default=True, nullable=False)
    review_request_delay_hours = Column(Integer, default=24, nullable=False)
    review_request_template_name = Column(String, nullable=False, default="review_request")
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    owner = relationship("User", back_populates="stores")
    customers = relationship("Customer", backref="store", cascade="all, delete-orphan")
    carts = relationship("AbandonedCart", backref="store", cascade="all, delete-orphan")
    message_logs = relationship("MessageLog", backref="store", cascade="all, delete-orphan")
    recovered_carts = relationship("RecoveredCart", backref="store", cascade="all, delete-orphan")
    reviews = relationship("CustomerReview", back_populates="store", cascade="all, delete-orphan")

