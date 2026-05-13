import logging
from app.core.database import AsyncSessionLocal
from app.services.reminder_service import ReminderService

logger = logging.getLogger(__name__)

async def run_reminder_job():
    logger.info("Executing run_reminder_job...")
    
    async with AsyncSessionLocal() as db:
        try:
            reminder_service = ReminderService()
            await reminder_service.process_pending_reminders(db)
        except Exception as e:
            logger.error(f"Error in background reminder job: {str(e)}")
