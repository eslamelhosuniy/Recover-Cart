from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List
from uuid import UUID
import logging
import re
try:
    from zoneinfo import ZoneInfo
except ImportError:
    ZoneInfo = None

from app.models.appointment import Appointment
from app.models.store import Store
from app.models.message_log import MessageLog
from app.repositories.appointment_repository import AppointmentRepository
from app.repositories.store_repository import StoreRepository
from app.repositories.message_repository import MessageRepository
from app.services.whatsapp_service import WhatsAppService
from app.core.exceptions import NotFoundException, ValidationException

logger = logging.getLogger(__name__)


class GHLAppointmentService:
    def __init__(self):
        self.appointment_repo = AppointmentRepository()
        self.store_repo = StoreRepository()
        self.message_repo = MessageRepository()
        self.whatsapp_service = WhatsAppService()

    def _parse_datetime(self, dt_str: Optional[str]) -> Optional[datetime]:
        if not dt_str:
            return None
        try:
            clean_str = dt_str.strip()
            if clean_str.endswith("Z"):
                clean_str = clean_str[:-1] + "+00:00"
            dt = datetime.fromisoformat(clean_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception as e:
            logger.warning(f"Failed to parse datetime '{dt_str}': {e}")
            return None

    def _format_appointment_time(self, dt: datetime, tz_name: Optional[str] = None) -> tuple[str, str]:
        """
        Formats datetime into date string (YYYY-MM-DD) and time string (e.g. 05:00 PM).
        Converts to specified timezone if available.
        """
        try:
            target_dt = dt
            if tz_name and ZoneInfo:
                try:
                    target_dt = dt.astimezone(ZoneInfo(tz_name))
                except Exception as tz_err:
                    logger.debug(f"Could not convert to timezone '{tz_name}': {tz_err}")
            date_str = target_dt.strftime("%Y-%m-%d")
            time_str = target_dt.strftime("%I:%M %p")
            return date_str, time_str
        except Exception:
            return str(dt), ""

    async def process_ghl_webhook(
        self, db: AsyncSession, payload: dict, store_id: UUID
    ) -> Optional[Appointment]:
        """
        Processes GoHighLevel webhook payload for calendar bookings.
        Creates or updates appointment, sends instant confirmation if enabled.
        """
        logger.info(f"Processing GHL Webhook for store {store_id}")
        
        store = await self.store_repo.get_by_id(db, store_id)
        if not store:
            raise NotFoundException(f"Store with id {store_id} not found")

        # 1. Extract contact details
        contact_id = payload.get("contact_id")
        first_name = payload.get("first_name") or ""
        last_name = payload.get("last_name") or ""
        full_name = payload.get("full_name") or f"{first_name} {last_name}".strip()
        if not full_name:
            full_name = payload.get("customData", {}).get("name") or "عميلنا العزيز"

        phone = payload.get("phone") or payload.get("customData", {}).get("phone") or ""
        email = payload.get("email") or ""
        customer_tz = payload.get("timezone") or "Africa/Cairo"

        # 2. Extract calendar & appointment details
        calendar_data = payload.get("calendar", {})
        ghl_appointment_id = calendar_data.get("appointmentId") or payload.get("appointment_id")
        if not ghl_appointment_id:
            logger.warning("GHL Webhook missing appointmentId in calendar object, searching fallback...")
            ghl_appointment_id = payload.get("id") or str(calendar_data.get("id"))

        if not ghl_appointment_id:
            raise ValidationException("Missing appointmentId in GoHighLevel webhook payload")

        calendar_id = calendar_data.get("id")
        calendar_name = calendar_data.get("calendarName") or calendar_data.get("title") or "حجز موعد"
        start_time_str = calendar_data.get("startTime")
        end_time_str = calendar_data.get("endTime")
        selected_tz = calendar_data.get("selectedTimezone") or "Asia/Kuwait"
        status = calendar_data.get("status") or "booked"
        appoinment_status = calendar_data.get("appoinmentStatus") or "confirmed"
        meeting_url = calendar_data.get("address") or ""

        # Location & Workflow
        location_data = payload.get("location", {})
        location_id = location_data.get("id")
        workflow_data = payload.get("workflow", {})
        workflow_id = workflow_data.get("id")

        start_time = self._parse_datetime(start_time_str)
        if not start_time:
            start_time = datetime.now(timezone.utc) + timedelta(days=1)
        end_time = self._parse_datetime(end_time_str)

        # 3. Check for existing appointment
        existing_appt = await self.appointment_repo.get_by_ghl_id(db, str(ghl_appointment_id), store_id)

        if existing_appt:
            logger.info(f"Updating existing appointment {existing_appt.id} (GHL: {ghl_appointment_id})")
            existing_appt.customer_name = full_name
            if phone:
                existing_appt.customer_phone = phone
            if email:
                existing_appt.customer_email = email
            existing_appt.start_time = start_time
            existing_appt.end_time = end_time
            existing_appt.status = status
            existing_appt.appointment_status = appoinment_status
            existing_appt.meeting_url = meeting_url or existing_appt.meeting_url
            existing_appt.raw_payload = payload
            
            # If rescheduled to a future time, reset reminder_sent so customer gets reminded for the new time
            if status in ["booked", "confirmed", "rescheduled"]:
                if existing_appt.start_time > datetime.now(timezone.utc):
                    existing_appt.reminder_sent = False

            await db.commit()
            await db.refresh(existing_appt)
            return existing_appt

        # 4. Create new Appointment
        new_appt = Appointment(
            store_id=store_id,
            ghl_appointment_id=str(ghl_appointment_id),
            ghl_calendar_id=str(calendar_id) if calendar_id else None,
            ghl_contact_id=str(contact_id) if contact_id else None,
            ghl_location_id=str(location_id) if location_id else None,
            ghl_workflow_id=str(workflow_id) if workflow_id else None,
            calendar_name=calendar_name,
            customer_name=full_name,
            customer_phone=phone,
            customer_email=email,
            customer_timezone=customer_tz,
            meeting_url=meeting_url,
            start_time=start_time,
            end_time=end_time,
            selected_timezone=selected_tz,
            status=status,
            appointment_status=appoinment_status,
            confirmation_sent=False,
            reminder_sent=False,
            manual_reminders_count=0,
            raw_payload=payload
        )

        db.add(new_appt)
        await db.commit()
        await db.refresh(new_appt)
        logger.info(f"Successfully created new appointment {new_appt.id} for {full_name}")

        # 5. Trigger Instant Confirmation if enabled
        if store.ghl_automation_enabled and store.ghl_instant_reminder_enabled:
            try:
                await self.send_instant_confirmation(db, new_appt.id)
            except Exception as e:
                logger.error(f"Failed to send instant confirmation for appt {new_appt.id}: {e}")

        return new_appt

    async def send_appointment_message(
        self,
        db: AsyncSession,
        appointment: Appointment,
        store: Store,
        template_name: str,
        message_type: str
    ) -> dict:
        """
        Builds dynamic parameters and dispatches WhatsApp message for an appointment.
        """
        if not store.whatsapp_phone_id or not store.whatsapp_access_token:
            logger.warning(f"Store {store.id} missing WhatsApp credentials, cannot send appointment message")
            raise ValidationException("إعدادات الواتساب غير مكتملة في هذا المتجر (Phone ID أو Access Token مفقود).")

        if not appointment.customer_phone:
            raise ValidationException("رقم هاتف العميل غير موجود.")

        date_str, time_str = self._format_appointment_time(
            appointment.start_time, appointment.selected_timezone or appointment.customer_timezone
        )
        customer_first_name = appointment.customer_name.split()[0] if appointment.customer_name else "عميلنا العزيز"
        cal_name = appointment.calendar_name or "الموعد المحدد"
        meeting_link = appointment.meeting_url or "سيتم تزويدك بالرابط قريباً"

        # Construct template components matching Meta WhatsApp templates
        # Category: Marketing / Utility
        # Template 1: appointment_confirmation -> Parameters: {{1}}=date, {{2}}=time
        # Template 2: appointment_reminder     -> Parameters: {{1}}=meeting_link
        clean_tpl = (template_name or "").strip().lower()

        if clean_tpl == "appointment_confirmation" or message_type == "appointment_confirmation":
            # Confirmation template: Only date and time variables
            components = [
                {
                    "type": "body",
                    "parameters": [
                        {"type": "text", "parameter_name": "date", "text": date_str},
                        {"type": "text", "parameter_name": "time", "text": time_str},
                    ]
                }
            ]
        elif clean_tpl == "appointment_reminder" or message_type in ["appointment_scheduled_reminder", "appointment_manual_reminder"]:
            # Reminder template: Contains 1 Body parameter (meet_link) AND 1 Button URL parameter (meet_link)
            url_suffix = "/".join(meeting_link.split('/')[3:]) if "://" in meeting_link else meeting_link
            components = [
                {
                    "type": "body",
                    "parameters": [
                        {
                            "type": "text",
                            "parameter_name": "meet_link",
                            "text": meeting_link
                        }
                    ]
                },
                {
                    "type": "button",
                    "sub_type": "url",
                    "index": "0",
                    "parameters": [
                        {
                            "type": "text",
                            "parameter_name": "meet_link",
                            "text": url_suffix
                        }
                    ]
                }
            ]
        else:
            # Fallback for custom/legacy templates
            body_params = [
                {"type": "text", "parameter_name": "name", "text": customer_first_name},
                {"type": "text", "parameter_name": "calendar_name", "text": cal_name},
                {"type": "text", "parameter_name": "date", "text": date_str},
                {"type": "text", "parameter_name": "time", "text": time_str},
            ]
            if meeting_link:
                body_params.append({"type": "text", "parameter_name": "link", "text": meeting_link})

            components = [{"type": "body", "parameters": body_params}]

            if meeting_link and (meeting_link.startswith("http://") or meeting_link.startswith("https://")):
                url_suffix = "/".join(meeting_link.split('/')[3:]) if "://" in meeting_link else meeting_link
                components.append({
                    "type": "button",
                    "sub_type": "url",
                    "index": "0",
                    "parameters": [
                        {
                            "type": "text",
                            "text": url_suffix
                        }
                    ]
                })

        logger.info(f"Sending WhatsApp message ({message_type}) to {appointment.customer_phone} using template {template_name}")

        try:
            response = await self.whatsapp_service.send_template_message(
                to_phone=appointment.customer_phone,
                template_name=template_name,
                whatsapp_phone_id=store.whatsapp_phone_id,
                whatsapp_token=store.whatsapp_access_token,
                language_code="ar",
                components=components
            )

            msg_id = response.get("messages", [{}])[0].get("id")
            msg_status = response.get("messages", [{}])[0].get("message_status", "sent")

            # Log to MessageLog
            msg_log = MessageLog(
                store_id=store.id,
                appointment_id=appointment.id,
                whatsapp_msg_id=msg_id,
                status=msg_status,
                channel="whatsapp",
                message_type=message_type,
                sent_at=datetime.now(timezone.utc)
            )
            db.add(msg_log)
            await db.commit()

            return response
        except Exception as e:
            logger.error(f"WhatsApp sending failed for appointment {appointment.id}: {str(e)}")
            msg_log = MessageLog(
                store_id=store.id,
                appointment_id=appointment.id,
                status="failed",
                channel="whatsapp",
                message_type=message_type,
                error_message=str(e),
                sent_at=datetime.now(timezone.utc)
            )
            db.add(msg_log)
            await db.commit()
            raise

    async def send_instant_confirmation(self, db: AsyncSession, appointment_id: UUID) -> bool:
        """
        Sends instant confirmation message for a newly booked appointment.
        """
        appointment = await self.appointment_repo.get_by_id(db, appointment_id)
        if not appointment:
            raise NotFoundException("Appointment not found")

        store = await self.store_repo.get_by_id(db, appointment.store_id)
        if not store:
            raise NotFoundException("Store not found")

        template_name = store.ghl_confirmation_template_name or store.ghl_reminder_template_name or "appointment_confirmation"

        try:
            await self.send_appointment_message(
                db=db,
                appointment=appointment,
                store=store,
                template_name=template_name,
                message_type="appointment_confirmation"
            )
            appointment.confirmation_sent = True
            appointment.confirmation_sent_at = datetime.now(timezone.utc)
            await db.commit()
            return True
        except Exception as e:
            logger.error(f"Error in send_instant_confirmation: {e}")
            return False

    async def send_scheduled_reminder(self, db: AsyncSession, appointment_id: UUID) -> bool:
        """
        Sends scheduled reminder before appointment start time.
        """
        appointment = await self.appointment_repo.get_by_id(db, appointment_id)
        if not appointment:
            raise NotFoundException("Appointment not found")

        if appointment.reminder_sent:
            logger.info(f"Reminder already sent for appointment {appointment_id}")
            return False

        if appointment.status in ["cancelled", "canceled", "noshow", "no_show"]:
            logger.info(f"Appointment {appointment_id} is cancelled, skipping reminder")
            return False

        store = await self.store_repo.get_by_id(db, appointment.store_id)
        if not store or not store.ghl_automation_enabled:
            return False

        template_name = store.ghl_reminder_template_name or "appointment_reminder"

        try:
            await self.send_appointment_message(
                db=db,
                appointment=appointment,
                store=store,
                template_name=template_name,
                message_type="appointment_scheduled_reminder"
            )
            appointment.reminder_sent = True
            appointment.reminder_sent_at = datetime.now(timezone.utc)
            await db.commit()
            return True
        except Exception as e:
            logger.error(f"Error sending scheduled reminder for appt {appointment.id}: {e}")
            return False

    async def send_manual_reminder(
        self, db: AsyncSession, appointment_id: UUID, template_name: Optional[str] = None
    ) -> bool:
        """
        Sends a manual on-demand reminder triggered from the UI.
        """
        appointment = await self.appointment_repo.get_by_id(db, appointment_id)
        if not appointment:
            raise NotFoundException("Appointment not found")

        store = await self.store_repo.get_by_id(db, appointment.store_id)
        if not store:
            raise NotFoundException("Store not found")

        chosen_template = template_name or store.ghl_reminder_template_name or "appointment_reminder"

        await self.send_appointment_message(
            db=db,
            appointment=appointment,
            store=store,
            template_name=chosen_template,
            message_type="appointment_manual_reminder"
        )

        appointment.manual_reminders_count = (appointment.manual_reminders_count or 0) + 1
        appointment.last_manual_reminder_at = datetime.now(timezone.utc)
        appointment.reminder_sent = True
        appointment.reminder_sent_at = datetime.now(timezone.utc)
        await db.commit()
        return True

    async def process_all_pending_reminders(self, db: AsyncSession) -> int:
        """
        Periodic worker to find and send reminders for all upcoming appointments across all stores.
        """
        stores_res = await db.execute(select(Store).where(Store.is_active == True, Store.ghl_automation_enabled == True))
        stores = stores_res.scalars().all()

        total_sent = 0
        for store in stores:
            timing_val = store.ghl_reminder_hours_before if store.ghl_reminder_hours_before is not None else 15
            # If timing_val is >= 15 (stored in minutes like 15, 30, 60, 120, 1440)
            # or if legacy 1 hour is set with appointment_reminder, use 15 minutes.
            if timing_val >= 15:
                reminder_minutes = timing_val
            elif timing_val == 1 and store.ghl_reminder_template_name == "appointment_reminder":
                reminder_minutes = 15
            else:
                reminder_minutes = timing_val * 60

            pending_appts = await self.appointment_repo.get_pending_scheduled_reminders(
                db, store.id, reminder_minutes_before=reminder_minutes
            )
            
            for appt in pending_appts:
                try:
                    success = await self.send_scheduled_reminder(db, appt.id)
                    if success:
                        total_sent += 1
                except Exception as e:
                    logger.error(f"Error processing reminder for appointment {appt.id}: {e}")

        return total_sent
