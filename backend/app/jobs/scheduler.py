from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.jobs.reminder_job import run_reminder_job
from app.config import settings
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

def start_scheduler():
    if not scheduler.running:
        interval_minutes = max(15, settings.reminder_delay_hours * 60)
        scheduler.add_job(
            run_reminder_job,
            trigger=IntervalTrigger(minutes=interval_minutes),
            id="hourly_reminder_job",
            name="Send abandoned cart reminders",
            replace_existing=True
        )
        scheduler.start()
        logger.info(f"APScheduler started. Reminder job scheduled every {interval_minutes} minutes.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler shutdown successfully.")
