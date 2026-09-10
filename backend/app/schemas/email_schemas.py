from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime


class EmailSettingCreate(BaseModel):
    provider: str = "mailgun"
    
    # SendGrid fields
    sendgrid_api_key: Optional[str] = None
    sendgrid_default_list_id: Optional[str] = None
    
    # Mailgun fields
    mailgun_api_key: Optional[str] = None
    mailgun_domain: Optional[str] = None
    mailgun_region: str = "us"
    mailgun_webhook_signing_key: Optional[str] = None
    mailgun_default_list_address: Optional[str] = None
    mailgun_ip_pool: Optional[str] = None
    
    # General Identity
    from_email: Optional[EmailStr] = None
    from_name: Optional[str] = None
    is_active: bool = False
    
    # Validation & Deliverability
    validation_delay_hours: int = 0
    validate_smtp: bool = False
    validate_mx: bool = True
    validate_spelling: bool = True
    
    # Warmup
    warmup_enabled: bool = False
    warmup_current_day: int = 1


class EmailSettingResponse(EmailSettingCreate):
    id: UUID
    store_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class EmailContactCreate(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    custom_attributes: Optional[Dict[str, Any]] = None
    list_id: Optional[str] = None
    is_subscribed: bool = True


class EmailCampaignCreate(BaseModel):
    name: str
    subject: str
    html_content: str = ""
    sender_id: Optional[int] = 1
    list_id: str
    suppression_group_id: Optional[int] = None
    custom_unsubscribe_url: Optional[str] = None
    is_warmup: bool = False


class CampaignUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    status: Optional[str] = None
    html_content: Optional[str] = None
    sender_id: Optional[int] = None
    list_id: Optional[str] = None
    suppression_group_id: Optional[int] = None
    custom_unsubscribe_url: Optional[str] = None
    is_warmup: Optional[bool] = None


class SingleEmailSend(BaseModel):
    to_email: EmailStr
    subject: str
    html_content: str
    from_name: Optional[str] = None


class EmailListCreate(BaseModel):
    name: str
    description: Optional[str] = None


class SuppressionGroupCreate(BaseModel):
    name: str
    description: str
    is_default: bool = False


class MailgunDomainStatusResponse(BaseModel):
    domain: str
    state: str
    is_active: bool
    spf_valid: bool
    dkim_valid: bool
    mx_valid: bool
    cname_valid: bool
    sending_dns_records: List[Dict[str, Any]] = []
    receiving_dns_records: List[Dict[str, Any]] = []
    created_at: Optional[str] = None
    error: Optional[str] = None


class MailgunIpWarmupToggleRequest(BaseModel):
    ip_address: str
    enable: bool = True
