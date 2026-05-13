from sqlalchemy import Column, String, Integer, Boolean
from sqlalchemy.dialects.postgresql import UUID
import uuid
from app.core.database import Base

class StoreSettings(Base):
    __tablename__ = "store_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_name = Column(String, nullable=False)
    salla_api_key = Column(String, nullable=False)
    whatsapp_phone_id = Column(String, nullable=False)
    automation_enabled = Column(Boolean, default=True)
    reminder_delay_hours = Column(Integer, default=1)
    max_retries = Column(Integer, default=3)
