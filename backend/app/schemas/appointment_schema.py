from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime


class GHLCalendarData(BaseModel):
    id: Optional[str] = None
    calendarName: Optional[str] = None
    title: Optional[str] = None
    appointmentId: Optional[str] = None
    startTime: Optional[str] = None
    endTime: Optional[str] = None
    selectedTimezone: Optional[str] = None
    status: Optional[str] = "booked"
    appoinmentStatus: Optional[str] = "confirmed"
    address: Optional[str] = None
    date_created: Optional[str] = None
    created_by: Optional[str] = None


class GHLLocationData(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    postalCode: Optional[str] = None
    fullAddress: Optional[str] = None


class GHLWorkflowData(BaseModel):
    id: Optional[str] = None
    name: Optional[str] = None


class GHLWebhookPayload(BaseModel):
    contact_id: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    tags: Optional[Any] = None
    country: Optional[str] = None
    timezone: Optional[str] = None
    date_created: Optional[str] = None
    website: Optional[str] = None
    contact_source: Optional[str] = None
    contact_type: Optional[str] = None
    location: Optional[GHLLocationData] = None
    calendar: Optional[GHLCalendarData] = None
    workflow: Optional[GHLWorkflowData] = None
    customData: Optional[Dict[str, Any]] = None
    contact: Optional[Dict[str, Any]] = None


class AppointmentBase(BaseModel):
    calendar_name: Optional[str] = None
    customer_name: str
    customer_phone: str
    customer_email: Optional[str] = None
    customer_timezone: Optional[str] = "Africa/Cairo"
    meeting_url: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    selected_timezone: Optional[str] = "Asia/Kuwait"
    status: str = "booked"
    appointment_status: Optional[str] = "confirmed"


class AppointmentCreate(AppointmentBase):
    store_id: UUID
    ghl_appointment_id: str
    ghl_calendar_id: Optional[str] = None
    ghl_contact_id: Optional[str] = None
    ghl_location_id: Optional[str] = None
    ghl_workflow_id: Optional[str] = None
    raw_payload: Optional[Dict[str, Any]] = None


class AppointmentUpdate(BaseModel):
    status: Optional[str] = None
    appointment_status: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    meeting_url: Optional[str] = None
    confirmation_sent: Optional[bool] = None
    confirmation_sent_at: Optional[datetime] = None
    reminder_sent: Optional[bool] = None
    reminder_sent_at: Optional[datetime] = None
    manual_reminders_count: Optional[int] = None
    last_manual_reminder_at: Optional[datetime] = None


class AppointmentResponse(AppointmentBase):
    id: UUID
    store_id: UUID
    ghl_appointment_id: str
    ghl_calendar_id: Optional[str] = None
    ghl_contact_id: Optional[str] = None
    ghl_location_id: Optional[str] = None
    ghl_workflow_id: Optional[str] = None
    confirmation_sent: bool
    confirmation_sent_at: Optional[datetime] = None
    reminder_sent: bool
    reminder_sent_at: Optional[datetime] = None
    manual_reminders_count: int
    last_manual_reminder_at: Optional[datetime] = None
    raw_payload: Optional[Dict[str, Any]] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AppointmentStatsResponse(BaseModel):
    total: int
    upcoming: int
    confirmed: int
    reminded: int
    cancelled: int


class ManualReminderRequest(BaseModel):
    template_name: Optional[str] = None
    custom_message: Optional[str] = None
