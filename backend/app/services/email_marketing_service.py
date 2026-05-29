from sqlalchemy.ext.asyncio import AsyncSession
import logging
from app.repositories.email_setting_repo import EmailSettingRepository
from app.repositories.email_contact_repo import EmailContactRepository
from app.repositories.email_campaign_repo import EmailCampaignRepository
from app.services.sendgrid_client import SendGridClient

logger = logging.getLogger(__name__)

class EmailMarketingService:
    def __init__(self):
        self.setting_repo = EmailSettingRepository()
        self.contact_repo = EmailContactRepository()
        self.campaign_repo = EmailCampaignRepository()

    async def get_senders(self, db: AsyncSession, store_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
        return await SendGridClient(settings.sendgrid_api_key).get_senders()

    async def get_lists(self, db: AsyncSession, store_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
        return await SendGridClient(settings.sendgrid_api_key).get_lists()

    async def get_suppression_groups(self, db: AsyncSession, store_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
        return await SendGridClient(settings.sendgrid_api_key).get_suppression_groups()

    async def sync_pending_contacts(self, db: AsyncSession, store_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key or not settings.sendgrid_default_list_id:
            logger.warning(f"Store {store_id} missing SendGrid configuration for contact sync.")
            return

        pending = await self.contact_repo.get_pending_sync_contacts(db)
        store_pending = [c for c in pending if str(c.store_id) == str(store_id)]
        
        if not store_pending:
            return

        client = SendGridClient(settings.sendgrid_api_key)
        
        # Group contacts by list_id
        from collections import defaultdict
        grouped_contacts = defaultdict(list)
        
        for contact in store_pending:
            target_list_id = contact.sendgrid_list_id or settings.sendgrid_default_list_id
            if target_list_id:
                grouped_contacts[target_list_id].append(contact)

        for list_id, group in grouped_contacts.items():
            sg_contacts = []
            for contact in group:
                data = {"email": contact.email}
                if contact.first_name: data["first_name"] = contact.first_name
                if contact.last_name: data["last_name"] = contact.last_name
                if contact.custom_attributes: data["custom_fields"] = contact.custom_attributes
                sg_contacts.append(data)

            try:
                await client.add_or_update_contacts(list_id, sg_contacts)
                for contact in group:
                    await self.contact_repo.update(db, contact, {"sync_status": "synced"})
                logger.info(f"Successfully sent {len(group)} contacts to SendGrid list {list_id} for store {store_id}")
            except Exception as e:
                logger.error(f"Failed to sync contacts to SendGrid list {list_id}: {str(e)}")
                for contact in group:
                    await self.contact_repo.update(db, contact, {"sync_status": "failed"})

    async def create_campaign(self, db: AsyncSession, store_id: str, name: str, subject: str, list_id: str, sender_id: int, suppression_group_id: int = None, custom_unsubscribe_url: str = None, html_content: str = ""):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")

        client = SendGridClient(settings.sendgrid_api_key)
        
        response = await client.create_single_send(
            name=name,
            subject=subject,
            list_id=list_id,
            sender_id=sender_id,
            suppression_group_id=suppression_group_id,
            custom_unsubscribe_url=custom_unsubscribe_url,
            html_content=html_content
        )
        
        sg_campaign_id = response.get("id")
        
        campaign_data = {
            "store_id": store_id,
            "sendgrid_campaign_id": sg_campaign_id,
            "name": name,
            "subject": subject,
            "status": "draft"
        }
        return await self.campaign_repo.create(db, campaign_data)

    async def schedule_campaign(self, db: AsyncSession, store_id: str, campaign_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")

        campaign = await self.campaign_repo.get_by_id(db, campaign_id)
        if not campaign or str(campaign.store_id) != str(store_id):
            raise ValueError("Campaign not found or does not belong to this store.")

        client = SendGridClient(settings.sendgrid_api_key)
        await client.schedule_single_send(campaign.sendgrid_campaign_id)
        
        return await self.campaign_repo.update(db, campaign, {"status": "scheduled"})

    async def send_transactional_email(self, db: AsyncSession, store_id: str, to_email: str, subject: str, html_content: str, from_name: str = None):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key or not settings.from_email:
            raise ValueError("Store missing SendGrid API key or 'from_email' setting.")

        client = SendGridClient(settings.sendgrid_api_key)
        
        response = await client.send_transactional_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            from_email=settings.from_email,
            from_name=from_name or settings.from_name
        )

        from app.repositories.email_tracking_repo import EmailTrackingRepository
        tracking_repo = EmailTrackingRepository()
        log_data = {
            "store_id": store_id,
            "sendgrid_msg_id": response.get("message_id", "unknown"),
            "event_type": "transactional_sent"
        }
        await tracking_repo.create(db, log_data)
        
        return response
