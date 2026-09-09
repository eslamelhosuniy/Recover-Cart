from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False, index=True)

    # GoHighLevel Identifiers
    ghl_appointment_id = Column(String, index=True, nullable=False)
    ghl_calendar_id = Column(String, index=True, nullable=True)
    ghl_contact_id = Column(String, index=True, nullable=True)
    ghl_location_id = Column(String, nullable=True)
    ghl_workflow_id = Column(String, nullable=True)

    # Contact & Appointment Details
    calendar_name = Column(String, nullable=True)
    customer_name = Column(String, nullable=False)
    customer_phone = Column(String, index=True, nullable=False)
    customer_email = Column(String, nullable=True)
    customer_timezone = Column(String, nullable=True, default="Africa/Cairo")
    meeting_url = Column(String, nullable=True)

    start_time = Column(DateTime(timezone=True), nullable=False, index=True)
    end_time = Column(DateTime(timezone=True), nullable=True)
    selected_timezone = Column(String, nullable=True, default="Asia/Kuwait")
    status = Column(String, default="booked", nullable=False)
    appointment_status = Column(String, default="confirmed", nullable=True)

    # Automation Flags & Timestamps
    confirmation_sent = Column(Boolean, default=False, nullable=False)
    confirmation_sent_at = Column(DateTime(timezone=True), nullable=True)

    reminder_sent = Column(Boolean, default=False, nullable=False)
    reminder_sent_at = Column(DateTime(timezone=True), nullable=True)

    manual_reminders_count = Column(Integer, default=0, nullable=False)
    last_manual_reminder_at = Column(DateTime(timezone=True), nullable=True)

    # Raw Payload for audit
    raw_payload = Column(JSON, nullable=True)

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    store = relationship("Store", back_populates="appointments")
