from fastapi import APIRouter, Request, BackgroundTasks
from typing import List, Dict, Any

from app.services.email_webhook_processor import EmailWebhookProcessor

router = APIRouter(prefix="/webhooks/sendgrid", tags=["Webhooks"])

@router.post("/{store_id}")
async def sendgrid_webhook(store_id: str, request: Request, background_tasks: BackgroundTasks):
    """
    Receives SendGrid events and processes them in the background.
    """
    try:
        payload = await request.json()
        if isinstance(payload, list):
            processor = EmailWebhookProcessor()
            background_tasks.add_task(processor.process_payload, store_id, payload)
    except Exception:
        pass
    
    return {"status": "ok"}
