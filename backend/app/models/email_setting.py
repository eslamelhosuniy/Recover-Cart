from sqlalchemy import Column, String, Boolean, ForeignKey, DateTime, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid
from datetime import datetime, timezone
from app.core.database import Base

class EmailSetting(Base):
    __tablename__ = "email_store_settings"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    store_id = Column(UUID(as_uuid=True), ForeignKey("stores.id"), unique=True, nullable=False)
    sendgrid_api_key = Column(String, nullable=True)
    sendgrid_default_list_id = Column(String, nullable=True)
    from_email = Column(String, nullable=True)
    from_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=False, nullable=False)
    
    validation_delay_hours = Column(Integer, default=0, nullable=False, server_default='0')
    validate_smtp = Column(Boolean, default=False, nullable=False, server_default='false')
    validate_mx = Column(Boolean, default=True, nullable=False, server_default='true')
    validate_spelling = Column(Boolean, default=True, nullable=False, server_default='true')
    
    warmup_enabled = Column(Boolean, default=False, nullable=False, server_default='false')
    warmup_current_day = Column(Integer, default=1, nullable=False, server_default='1')

    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    store = relationship("Store", backref="email_settings")
