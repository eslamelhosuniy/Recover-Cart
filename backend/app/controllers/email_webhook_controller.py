from fastapi import APIRouter, Request, BackgroundTasks, HTTPException, Depends
from typing import List, Dict, Any
import logging
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_db
from app.services.email_webhook_processor import EmailWebhookProcessor
from app.repositories.email_setting_repo import EmailSettingRepository
from app.services.email_providers.mailgun_client import MailgunClient

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/sendgrid/{store_id}")
async def sendgrid_webhook(store_id: str, request: Request, background_tasks: BackgroundTasks):
    """
    Receives SendGrid events and processes them in the background.
    """
    try:
        payload = await request.json()
        if isinstance(payload, list):
            processor = EmailWebhookProcessor()
            background_tasks.add_task(processor.process_sendgrid_payload, store_id, payload)
    except Exception as e:
        logger.error(f"Error reading SendGrid webhook payload: {e}")
    
    return {"status": "ok"}


@router.post("/mailgun/{store_id}")
async def mailgun_webhook(
    store_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Receives Mailgun event webhooks, verifies HMAC-SHA256 signature, and dispatches processing to background.
    """
    try:
        payload = await request.json()
    except Exception as e:
        logger.error(f"Error parsing Mailgun webhook JSON: {e}")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # Fetch store email settings for signature verification
    setting_repo = EmailSettingRepository()
    settings = await setting_repo.get_by_store_id(db, store_id)
    
    if not settings:
        logger.warning(f"Mailgun webhook received for unknown store {store_id}")
        return {"status": "ignored", "reason": "store not found"}

    # Extract signature parameters
    sig_data = payload.get("signature", {})
    token = sig_data.get("token")
    timestamp = str(sig_data.get("timestamp", ""))
    signature = sig_data.get("signature")

    signing_key = settings.mailgun_webhook_signing_key or settings.mailgun_api_key

    # Verify signature if key is present
    if signing_key and token and timestamp and signature:
        client = MailgunClient(
            api_key=settings.mailgun_api_key or "",
            domain=settings.mailgun_domain or "",
            webhook_signing_key=signing_key
        )
        is_valid = client.verify_webhook_signature(
            token=token,
            timestamp=timestamp,
            signature=signature,
            signing_key=signing_key
        )
        if not is_valid:
            logger.warning(f"Mailgun webhook signature verification failed for store {store_id}")
            raise HTTPException(status_code=403, detail="Invalid webhook signature")

    processor = EmailWebhookProcessor()
    background_tasks.add_task(processor.process_mailgun_payload, store_id, payload)

    return {"status": "ok"}
