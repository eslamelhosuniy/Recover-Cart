from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from app.jobs.reminder_job import run_reminder_job
from app.jobs.review_request_job import run_review_request_job
from app.config import settings
import logging

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

from app.jobs.email_validation_job import run_email_validation_job
from app.jobs.sync_sendgrid_job import run_sync_sendgrid_job

def start_scheduler():
    if not scheduler.running:
        # Reminder job interval
        reminder_interval = max(15, settings.reminder_delay_hours * 60)
        scheduler.add_job(
            run_reminder_job,
            trigger=IntervalTrigger(minutes=reminder_interval),
            id="hourly_reminder_job",
            name="Send abandoned cart reminders",
            replace_existing=True
        )
        
        # Review request job interval (every hour)
        scheduler.add_job(
            run_review_request_job,
            trigger=IntervalTrigger(minutes=60),
            id="review_request_job",
            name="Send pending review requests",
            replace_existing=True
        )
        
        # Email validation job (every 5 minutes)
        scheduler.add_job(
            run_email_validation_job,
            trigger=IntervalTrigger(minutes=5),
            id="email_validation_job",
            name="Validate pending emails",
            replace_existing=True
        )
        
        # SendGrid Two-Way Sync job (every 60 minutes)
        scheduler.add_job(
            run_sync_sendgrid_job,
            trigger=IntervalTrigger(minutes=60),
            id="sync_sendgrid_job",
            name="Sync SendGrid contacts and campaigns",
            replace_existing=True
        )

        
        scheduler.start()
        logger.info(f"APScheduler started. Reminder job every {reminder_interval}m, Review job every 60m, Validation job every 5m.")

def shutdown_scheduler():
    if scheduler.running:
        scheduler.shutdown()
        logger.info("APScheduler shutdown successfully.")

