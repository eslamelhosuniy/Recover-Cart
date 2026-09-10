import logging
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.email_tracking_repo import EmailTrackingRepository
from typing import List, Dict, Any, Union
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


class EmailWebhookProcessor:
    def __init__(self):
        self.tracking_repo = EmailTrackingRepository()

    async def process_sendgrid_payload(self, store_id: str, payload: List[Dict[str, Any]]):
        """
        Processes SendGrid webhook events array.
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
                        "provider": "sendgrid",
                        "event_type": event_type,
                        "url": url
                    }
                    if campaign_id: tracking_data["campaign_id"] = campaign_id
                    if contact_id: tracking_data["contact_id"] = contact_id
                    
                    await self.tracking_repo.create(db, tracking_data)
                except Exception as e:
                    logger.error(f"Error processing SendGrid webhook event: {str(e)}")
            
            logger.info(f"Processed {len(payload)} SendGrid webhook events for store {store_id}")

    async def process_mailgun_payload(self, store_id: str, payload: Dict[str, Any]):
        """
        Processes Mailgun webhook event object.
        """
        from app.core.database import async_session_maker
        async with async_session_maker() as db:
            try:
                event_data = payload.get("event-data", payload)
                raw_event_type = event_data.get("event", "unknown")

                # Normalize Mailgun event type
                # delivered -> delivered, opened -> open, clicked -> click, unsubscribed -> unsubscribe, complained -> spamreport, failed -> bounce/dropped
                event_map = {
                    "delivered": "delivered",
                    "opened": "open",
                    "clicked": "click",
                    "unsubscribed": "unsubscribe",
                    "complained": "spamreport",
                    "failed": "bounce" if event_data.get("severity") == "permanent" else "deferred",
                    "accepted": "processed"
                }
                event_type = event_map.get(raw_event_type, raw_event_type)

                # Extract message ID
                msg_headers = event_data.get("message", {}).get("headers", {})
                message_id = msg_headers.get("message-id", "")
                if not message_id:
                    message_id = event_data.get("id", "unknown")
                clean_msg_id = message_id.strip("<>")

                # Extract user variables / tags
                user_vars = event_data.get("user-variables", {})
                campaign_id = user_vars.get("campaign_id") or user_vars.get("campaignId")
                contact_id = user_vars.get("contact_id") or user_vars.get("contactId")
                url = event_data.get("url")

                timestamp_val = event_data.get("timestamp")
                dt = datetime.fromtimestamp(timestamp_val, tz=timezone.utc) if timestamp_val else datetime.now(timezone.utc)

                tracking_data = {
                    "store_id": store_id,
                    "sendgrid_msg_id": clean_msg_id,
                    "provider": "mailgun",
                    "event_type": event_type,
                    "url": url,
                    "timestamp": dt
                }
                if campaign_id: tracking_data["campaign_id"] = campaign_id
                if contact_id: tracking_data["contact_id"] = contact_id

                await self.tracking_repo.create(db, tracking_data)
                logger.info(f"Processed Mailgun webhook event '{event_type}' for store {store_id}")
            except Exception as e:
                logger.error(f"Error processing Mailgun webhook event: {str(e)}")

    async def process_payload(self, store_id: str, payload: Union[List[Dict[str, Any]], Dict[str, Any]]):
        """Unified entry point that auto-detects payload format"""
        if isinstance(payload, list):
            await self.process_sendgrid_payload(store_id, payload)
        elif isinstance(payload, dict):
            await self.process_mailgun_payload(store_id, payload)
