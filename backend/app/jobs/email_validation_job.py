import logging
from sqlalchemy.future import select
from sqlalchemy import update
from app.core.database import AsyncSessionLocal
from app.models.email_contact import EmailContact
from app.models.email_setting import EmailSetting
from app.services.email_validation_service import email_validation_service
import asyncio

logger = logging.getLogger(__name__)

BATCH_SIZE = 50

async def run_email_validation_job():
    logger.info("Starting email validation background job...")
    
    async with AsyncSessionLocal() as db:
        try:
            # Query pending emails
            query = select(EmailContact).where(EmailContact.validation_status == "pending").limit(BATCH_SIZE)
            result = await db.execute(query)
            pending_contacts = result.scalars().all()
            
            if not pending_contacts:
                logger.info("No pending emails to validate.")
                return
            
            # Fetch settings for all involved stores
            store_ids = list(set(c.store_id for c in pending_contacts))
            settings_query = select(EmailSetting).where(EmailSetting.store_id.in_(store_ids))
            settings_result = await db.execute(settings_query)
            settings_map = {s.store_id: s for s in settings_result.scalars().all()}
            
            from datetime import datetime, timezone, timedelta
            now = datetime.now(timezone.utc)
            
            contacts_to_validate = []
            for contact in pending_contacts:
                setting = settings_map.get(contact.store_id)
                delay_hours = setting.validation_delay_hours if setting else 0
                
                # Check delay
                if contact.created_at and (now - contact.created_at) < timedelta(hours=delay_hours):
                    continue
                
                contacts_to_validate.append((contact, setting))
            
            if not contacts_to_validate:
                logger.info("Pending emails found, but none have passed their validation delay yet.")
                return

            logger.info(f"Validating {len(contacts_to_validate)} emails...")
            
            tasks = []
            for contact, setting in contacts_to_validate:
                use_smtp = setting.validate_smtp if setting else False
                check_mx = setting.validate_mx if setting else True
                check_spelling = setting.validate_spelling if setting else True
                
                tasks.append(
                    email_validation_service.validate_email(
                        contact.email, 
                        use_smtp=use_smtp, 
                        check_mx_flag=check_mx, 
                        check_spelling=check_spelling
                    )
                )
                
            validation_results = await asyncio.gather(*tasks, return_exceptions=True)
            
            for (contact, setting), res in zip(contacts_to_validate, validation_results):
                if isinstance(res, Exception):
                    logger.error(f"Error validating {contact.email}: {res}")
                    continue
                
                contact.validation_status = res.get("status")
                contact.validation_reason = res.get("reason")
                contact.has_mx = res.get("has_mx")
                contact.mx_host = res.get("mx_host")
                contact.smtp_valid = res.get("smtp_valid")
                
                db.add(contact)
            
            await db.commit()
            logger.info(f"Successfully validated and updated {len(contacts_to_validate)} emails.")
        
        except Exception as e:
            logger.error(f"Email validation job failed: {e}")
