import logging
from app.core.database import AsyncSessionLocal
from app.services.ghl_appointment_service import GHLAppointmentService

logger = logging.getLogger(__name__)


async def run_appointment_reminder_job():
    logger.info("Executing run_appointment_reminder_job...")

    async with AsyncSessionLocal() as db:
        try:
            ghl_service = GHLAppointmentService()
            sent_count = await ghl_service.process_all_pending_reminders(db)
            if sent_count > 0:
                logger.info(f"Successfully processed and sent {sent_count} scheduled appointment reminders.")
        except Exception as e:
            logger.error(f"Error in background appointment reminder job: {str(e)}", exc_info=True)
