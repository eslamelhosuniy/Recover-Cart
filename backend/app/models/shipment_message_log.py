from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base


class ShipmentMessageLog(Base):
    __tablename__ = "shipment_message_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False)
    shipment_id = Column(UUID(as_uuid=True), ForeignKey("shipment_reviews.id"), nullable=False)
    whatsapp_msg_id = Column(String, nullable=True)
    status = Column(String, default="pending", nullable=False)
    channel = Column(String, default="whatsapp", nullable=False)
    sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )
    error_message = Column(Text, nullable=True)

    shipment = relationship("ShipmentReview", back_populates="messages")
    store = relationship("Store", back_populates="shipment_message_logs")
