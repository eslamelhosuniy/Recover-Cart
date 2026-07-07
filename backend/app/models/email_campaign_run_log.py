from sqlalchemy import Column, String, ForeignKey, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base


class EmailCampaignRunLog(Base):
    __tablename__ = "email_campaign_run_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id"), nullable=False)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("email_campaigns.id"), nullable=False)
    event_type = Column(String, nullable=False)
    status = Column(String, nullable=False, default="completed")
    message = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    triggered_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    store = relationship("Store", backref="email_campaign_run_logs")
    campaign = relationship("EmailCampaign", backref="run_logs")
