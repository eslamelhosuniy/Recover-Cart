import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.store import Store
from app.models.email_campaign import EmailCampaign
from app.models.email_contact import EmailContact
from app.models.email_campaign_contact import EmailCampaignContact
from app.repositories.email_setting_repo import EmailSettingRepository
from app.services.sendgrid_client import SendGridClient
from app.core.database import async_session_maker
import asyncio

logger = logging.getLogger(__name__)

async def run_sync_sendgrid_job():
    """
    Background job to sync all existing single sends (campaigns) and contacts from Sendgrid
    for all stores that have an API key configured.
    """
    logger.info("Starting background SendGrid Sync Job")
    
    async with async_session_maker() as db:
        stores = await db.execute(select(Store))
        for store in stores.scalars().all():
            try:
                await sync_heavy_data_for_store(db, str(store.id))
            except Exception as e:
                logger.error(f"Error syncing heavy sendgrid data for store {store.id}: {e}")

async def trigger_heavy_sync_for_store(store_id: str):
    """Wrapper to be called asynchronously after saving API key"""
    logger.info(f"Triggering immediate heavy sync for store {store_id}")
    async with async_session_maker() as db:
        try:
            await sync_heavy_data_for_store(db, store_id)
        except Exception as e:
            logger.error(f"Error in immediate heavy sync for store {store_id}: {e}")

async def sync_heavy_data_for_store(db: AsyncSession, store_id: str):
    setting_repo = EmailSettingRepository()
    settings = await setting_repo.get_by_store_id(db, store_id)
    
    if not settings or not settings.sendgrid_api_key:
        return
        
    client = SendGridClient(settings.sendgrid_api_key)
    
    # 1. Sync Campaigns (Single Sends)
    logger.info(f"Syncing campaigns for store {store_id}")
    page_token = None
    while True:
        try:
            resp = await client.get_single_sends_page(page_token=page_token)
            campaigns = resp.get("result", [])
            
            for camp in campaigns:
                sg_camp_id = camp.get("id")
                
                # Check if it exists
                existing = await db.scalar(select(EmailCampaign).where(
                    EmailCampaign.store_id == store_id, 
                    EmailCampaign.sendgrid_campaign_id == sg_camp_id
                ))
                
                status_map = {
                    "draft": "draft",
                    "scheduled": "scheduled",
                    "triggered": "sent",
                    "done": "sent"
                }
                sg_status = camp.get("status", "").lower()
                db_status = status_map.get(sg_status, "draft")
                
                if existing:
                    existing.name = camp.get("name", existing.name)
                    existing.status = db_status
                else:
                    new_camp = EmailCampaign(
                        store_id=store_id,
                        sendgrid_campaign_id=sg_camp_id,
                        name=camp.get("name", "Untitled Campaign"),
                        status=db_status,
                        subject=camp.get("email_config", {}).get("subject", "")
                    )
                    db.add(new_camp)
                    
            await db.commit()
            
            _metadata = resp.get("_metadata", {})
            next_url = _metadata.get("next")
            if next_url and "page_token=" in next_url:
                page_token = next_url.split("page_token=")[-1]
            else:
                break
                
        except Exception as e:
            logger.error(f"Error paginating campaigns for store {store_id}: {e}")
            break

    # 2. Sync Contacts
    logger.info(f"Syncing contacts for store {store_id}")
    page_token = None
    while True:
        try:
            resp = await client.get_contacts_page(page_token=page_token)
            contacts = resp.get("result", [])
            
            for c in contacts:
                email = c.get("email")
                if not email: continue
                
                # Check if exists
                existing = await db.scalar(select(EmailContact).where(
                    EmailContact.store_id == store_id,
                    EmailContact.email == email
                ))
                
                # get list id
                list_ids = c.get("list_ids", [])
                primary_list = list_ids[0] if list_ids else None
                
                if existing:
                    existing.first_name = c.get("first_name", existing.first_name)
                    existing.last_name = c.get("last_name", existing.last_name)
                    if primary_list and not existing.sendgrid_list_id:
                        existing.sendgrid_list_id = primary_list
                    existing.sync_status = "synced"
                else:
                    new_contact = EmailContact(
                        store_id=store_id,
                        email=email,
                        first_name=c.get("first_name"),
                        last_name=c.get("last_name"),
                        sendgrid_list_id=primary_list,
                        sync_status="synced"
                    )
                    db.add(new_contact)
                    
            await db.commit()
            
            _metadata = resp.get("_metadata", {})
            next_url = _metadata.get("next")
            
            # SendGrid POST /search returns a page_token directly in response sometimes, or _metadata.next
            # We'll extract it from next_url if it exists.
            if next_url and "page_token=" in next_url:
                page_token = next_url.split("page_token=")[-1]
            else:
                break
                
        except Exception as e:
            logger.error(f"Error paginating contacts for store {store_id}: {e}")
            break

    logger.info(f"Completed heavy sync for store {store_id}")
