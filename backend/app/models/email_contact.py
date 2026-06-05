from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

class EmailContact(Base):
    __tablename__ = "email_contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False)
    email = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    custom_attributes = Column(JSONB, nullable=True)
    is_subscribed = Column(Boolean, default=True, nullable=False)
    sync_status = Column(String, default="pending", nullable=False)
    sendgrid_list_id = Column(String, nullable=True)
    validation_status = Column(String, default="pending", nullable=False) # pending, valid, risky, invalid
    validation_reason = Column(String, nullable=True)
    has_mx = Column(Boolean, nullable=True)
    mx_host = Column(String, nullable=True)
    smtp_valid = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    store = relationship("Store", backref="email_contacts")

    __table_args__ = (
        Index("uix_email_contacts_store_email", "store_id", "email", unique=True),
    )
