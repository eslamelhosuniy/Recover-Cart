from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base


class CustomerReview(Base):
    __tablename__ = "customer_reviews"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)
    merchant_id = Column(String, nullable=True, index=True)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("customers.id"), nullable=False, index=True)
    customer_name = Column(String, nullable=True)
    customer_mobile = Column(String, nullable=True)
    recovered_cart_id = Column(UUID(as_uuid=True), ForeignKey("recovered_carts.id"), nullable=True, index=True)
    order_id = Column(String, nullable=True, index=True)
    order_reference_id = Column(String, nullable=True)
    product_id = Column(String, nullable=True, index=True)
    review_type = Column(String, default="rating", nullable=False)
    rating = Column(String, nullable=True)  # Stored as string: "1", "2", "3", "4", "5"
    review_content = Column(Text, nullable=True)
    raw_payload = Column(JSON, nullable=True)  # Full webhook payload for audit trail
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    # Relationships
    customer = relationship("Customer", back_populates="reviews")
    store = relationship("Store", back_populates="reviews")
    recovered_cart = relationship("RecoveredCart", back_populates="review")
