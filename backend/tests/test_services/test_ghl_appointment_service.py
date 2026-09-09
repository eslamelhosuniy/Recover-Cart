import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from uuid import uuid4
from datetime import datetime, timezone, timedelta

from app.services.ghl_appointment_service import GHLAppointmentService
from app.models.appointment import Appointment
from app.models.store import Store


@pytest.fixture
def ghl_sample_payload():
    return {
        "contact_id": "dCU1fwDXOEU4EzHJgpCU",
        "first_name": "Eslam",
        "last_name": "Elhosuniy",
        "full_name": "Eslam Elhosuniy",
        "email": "eslamelhosuniy5@gmail.com",
        "phone": "+201222203198",
        "tags": "",
        "country": "SA",
        "timezone": "Africa/Cairo",
        "date_created": "2026-09-08T18:45:39.732Z",
        "website": "https://test.com",
        "contact_source": "تقويم تشخيص النمو ",
        "full_address": "",
        "contact_type": "lead",
        "location": {
            "name": "Wedad Marketing",
            "address": "saudi arabia",
            "city": "saudi arabia",
            "state": "saudi arabia",
            "country": "SA",
            "postalCode": "66442",
            "fullAddress": "saudi arabia, saudi arabia saudi arabia 66442",
            "id": "jfjNQcRLiD0GRtYG7lxI"
        },
        "calendar": {
            "title": "Eslam Elhosuniy",
            "selectedTimezone": "Asia/Kuwait",
            "appointmentId": "CZvjjEJy8NHQAlbSQ6dM",
            "startTime": "2026-09-13T17:00:00",
            "endTime": "2026-09-13T17:30:00",
            "status": "booked",
            "appoinmentStatus": "confirmed",
            "address": "https://meet.google.com/ihf-wnyy-gep",
            "date_created": "2026-09-08T18:45:42.460Z",
            "created_by": "",
            "created_by_user_id": None,
            "created_by_meta": {"source": "booking_widget"},
            "last_updated_by_meta": {"source": "booking_widget"},
            "id": "j9UeAGbFxXl6tVsJ8N5V",
            "calendarName": "تقويم تشخيص النمو "
        },
        "workflow": {
            "id": "6a5e39c5-2b94-43d9-bb75-204adc090970",
            "name": "New Workflow : 1788892567453"
        },
        "triggerData": {},
        "customData": {
            "name": "Eslam Elhosuniy",
            "phone": "+20 12 22203198"
        }
    }


@pytest.mark.asyncio
async def test_process_ghl_webhook_creates_appointment(ghl_sample_payload):
    service = GHLAppointmentService()
    db_mock = AsyncMock()
    store_id = uuid4()

    mock_store = Store(
        id=store_id,
        store_name="Test Store",
        whatsapp_phone_id="123456",
        whatsapp_access_token="fake_token",
        ghl_automation_enabled=True,
        ghl_instant_reminder_enabled=False
    )

    with patch.object(service.store_repo, "get_by_id", return_value=mock_store), \
         patch.object(service.appointment_repo, "get_by_ghl_id", return_value=None):
        
        appt = await service.process_ghl_webhook(db_mock, ghl_sample_payload, store_id)

        assert appt is not None
        assert appt.ghl_appointment_id == "CZvjjEJy8NHQAlbSQ6dM"
        assert appt.customer_name == "Eslam Elhosuniy"
        assert appt.customer_phone == "+201222203198"
        assert appt.customer_email == "eslamelhosuniy5@gmail.com"
        assert appt.calendar_name == "تقويم تشخيص النمو "
        assert appt.meeting_url == "https://meet.google.com/ihf-wnyy-gep"
        assert appt.status == "booked"
        assert appt.appointment_status == "confirmed"
        assert appt.start_time is not None
        db_mock.add.assert_called_once()
        db_mock.commit.assert_called()


@pytest.mark.asyncio
async def test_send_manual_reminder(ghl_sample_payload):
    service = GHLAppointmentService()
    db_mock = AsyncMock()
    appt_id = uuid4()
    store_id = uuid4()

    mock_appt = Appointment(
        id=appt_id,
        store_id=store_id,
        ghl_appointment_id="CZvjjEJy8NHQAlbSQ6dM",
        customer_name="Eslam Elhosuniy",
        customer_phone="+201222203198",
        calendar_name="تقويم تشخيص النمو",
        meeting_url="https://meet.google.com/ihf-wnyy-gep",
        start_time=datetime.now(timezone.utc) + timedelta(hours=2),
        status="booked",
        manual_reminders_count=0
    )

    mock_store = Store(
        id=store_id,
        store_name="Test Store",
        whatsapp_phone_id="phone_123",
        whatsapp_access_token="token_abc",
        ghl_reminder_template_name="appointment_reminder"
    )

    mock_send = AsyncMock(return_value={"messages": [{"id": "wamid.456", "message_status": "sent"}]})

    with patch.object(service.appointment_repo, "get_by_id", return_value=mock_appt), \
         patch.object(service.store_repo, "get_by_id", return_value=mock_store), \
         patch.object(service.whatsapp_service, "send_template_message", mock_send):
        
        success = await service.send_manual_reminder(db_mock, appt_id)

        assert success is True
        assert mock_appt.manual_reminders_count == 1
        assert mock_appt.reminder_sent is True
        assert mock_appt.reminder_sent_at is not None

        # Verify exact parameters sent to WhatsApp for appointment_reminder (Body + Button URL)
        mock_send.assert_called_once()
        _, kwargs = mock_send.call_args
        assert kwargs["template_name"] == "appointment_reminder"
        assert len(kwargs["components"]) == 2
        # Component 1: Body
        assert kwargs["components"][0]["type"] == "body"
        assert len(kwargs["components"][0]["parameters"]) == 1
        assert kwargs["components"][0]["parameters"][0]["text"] == "https://meet.google.com/ihf-wnyy-gep"
        assert kwargs["components"][0]["parameters"][0]["parameter_name"] == "meet_link"
        # Component 2: Button URL
        assert kwargs["components"][1]["type"] == "button"
        assert kwargs["components"][1]["sub_type"] == "url"
        assert kwargs["components"][1]["index"] == "0"
        assert len(kwargs["components"][1]["parameters"]) == 1
        assert kwargs["components"][1]["parameters"][0]["text"] == "ihf-wnyy-gep"
        assert kwargs["components"][1]["parameters"][0]["parameter_name"] == "meet_link"


@pytest.mark.asyncio
async def test_send_instant_confirmation():
    service = GHLAppointmentService()
    db_mock = AsyncMock()
    appt_id = uuid4()
    store_id = uuid4()

    start_time = datetime(2026, 9, 13, 17, 0, tzinfo=timezone.utc)

    mock_appt = Appointment(
        id=appt_id,
        store_id=store_id,
        ghl_appointment_id="CZvjjEJy8NHQAlbSQ6dM",
        customer_name="Eslam Elhosuniy",
        customer_phone="+201222203198",
        calendar_name="تقويم تشخيص النمو",
        meeting_url="https://meet.google.com/ihf-wnyy-gep",
        start_time=start_time,
        status="booked",
        confirmation_sent=False
    )

    mock_store = Store(
        id=store_id,
        store_name="Test Store",
        whatsapp_phone_id="phone_123",
        whatsapp_access_token="token_abc",
        ghl_confirmation_template_name="appointment_confirmation"
    )

    mock_send = AsyncMock(return_value={"messages": [{"id": "wamid.789", "message_status": "sent"}]})

    with patch.object(service.appointment_repo, "get_by_id", return_value=mock_appt), \
         patch.object(service.store_repo, "get_by_id", return_value=mock_store), \
         patch.object(service.whatsapp_service, "send_template_message", mock_send):
        
        success = await service.send_instant_confirmation(db_mock, appt_id)

        assert success is True
        assert mock_appt.confirmation_sent is True

        # Verify exact parameters sent to WhatsApp for appointment_confirmation
        mock_send.assert_called_once()
        _, kwargs = mock_send.call_args
        assert kwargs["template_name"] == "appointment_confirmation"
        assert len(kwargs["components"]) == 1
        assert kwargs["components"][0]["type"] == "body"
        # Must have exactly 2 parameters: date and time
        params = kwargs["components"][0]["parameters"]
        assert len(params) == 2
        assert params[0]["text"] == "2026-09-13"
        assert params[1]["text"] == "05:00 PM"
