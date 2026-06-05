from sqlalchemy import Column, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

class EmailCampaignContact(Base):
    __tablename__ = "email_campaign_contacts"

    campaign_id = Column(UUID(as_uuid=True), ForeignKey("email_campaigns.id", ondelete="CASCADE"), primary_key=True)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("email_contacts.id", ondelete="CASCADE"), primary_key=True)
    sent_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    campaign = relationship("EmailCampaign", backref="campaign_contacts")
    contact = relationship("EmailContact", backref="contact_campaigns")
