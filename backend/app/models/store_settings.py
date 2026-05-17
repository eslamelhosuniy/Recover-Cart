from sqlalchemy import Column, String, Integer, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from app.core.database import Base

class StoreSettings(Base):
    __tablename__ = "store_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, unique=True)
    store_name = Column(String, nullable=False)
    salla_api_key = Column(String, nullable=False)
    whatsapp_phone_id = Column(String, nullable=False)
    whatsapp_access_token = Column(String, nullable=False, default="")
    whatsapp_template_name = Column(String, nullable=False, default="hello_world")
    automation_enabled = Column(Boolean, default=True)
    reminder_delay_hours = Column(Integer, default=1)
    max_retries = Column(Integer, default=3)

    user = relationship("User", backref="settings")
