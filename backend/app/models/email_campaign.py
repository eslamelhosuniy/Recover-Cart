from sqlalchemy import Column, String, ForeignKey, DateTime, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

class EmailCampaign(Base):
    __tablename__ = "email_campaigns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False)
    sendgrid_campaign_id = Column(String, nullable=True)
    name = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    status = Column(String, default="draft", nullable=False)
    is_warmup = Column(Boolean, default=False, nullable=False, server_default='false')
    parent_id = Column(UUID(as_uuid=True), ForeignKey("email_campaigns.id"), nullable=True)
    warmup_day = Column(Integer, nullable=True)
    warmup_current_offset = Column(Integer, default=0, nullable=False, server_default='0')
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    store = relationship("Store", backref="email_campaigns")
    child_campaigns = relationship("EmailCampaign", backref="parent_campaign", remote_side=[id])
