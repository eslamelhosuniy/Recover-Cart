from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

class EmailTrackingLog(Base):
    __tablename__ = "email_tracking_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("email_campaigns.id"), nullable=True)
    contact_id = Column(UUID(as_uuid=True), ForeignKey("email_contacts.id"), nullable=True)
    sendgrid_msg_id = Column(String, index=True, nullable=False)
    event_type = Column(String, nullable=False)
    url = Column(String, nullable=True)
    timestamp = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    store = relationship("Store", backref="email_tracking_logs")
    campaign = relationship("EmailCampaign", backref="tracking_logs")
    contact = relationship("EmailContact", backref="tracking_logs")
