import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.email_tracking_repo import EmailTrackingRepository
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class EmailWebhookProcessor:
    def __init__(self):
        self.tracking_repo = EmailTrackingRepository()

    async def process_payload(self, store_id: str, payload: List[Dict[str, Any]]):
        """
        Runs in the background to parse events and store them.
        """
        from app.core.database import async_session_maker
        async with async_session_maker() as db:
            for event in payload:
                try:
                    event_type = event.get("event")
                    sg_message_id = event.get("sg_message_id")
                    
                    if not event_type or not sg_message_id:
                        continue
                    
                    sg_msg_id_clean = sg_message_id.split('.')[0] if '.' in sg_message_id else sg_message_id

                    campaign_id = event.get("campaign_id") 
                    contact_id = event.get("contact_id")
                    url = event.get("url")

                    tracking_data = {
                        "store_id": store_id,
                        "sendgrid_msg_id": sg_msg_id_clean,
                        "event_type": event_type,
                        "url": url
                    }
                    if campaign_id: tracking_data["campaign_id"] = campaign_id
                    if contact_id: tracking_data["contact_id"] = contact_id
                    
                    await self.tracking_repo.create(db, tracking_data)
                except Exception as e:
                    logger.error(f"Error processing single webhook event: {str(e)}")
            
            logger.info(f"Processed {len(payload)} webhook events for store {store_id}")
