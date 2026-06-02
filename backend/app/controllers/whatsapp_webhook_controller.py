"""
WhatsApp status update webhook.

Meta sends status updates via POST to a registered webhook URL.
Expected payload (simplified):
{
  "object": "whatsapp_business_account",
  "entry": [{
    "changes": [{
      "value": {
        "statuses": [{
          "id": "<whatsapp_msg_id>",
          "status": "sent" | "delivered" | "read" | "failed",
          ...
        }]
      }
    }]
  }]
}
"""
from fastapi import APIRouter, Depends, Request, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.dependencies import get_db
from app.models.message_log import MessageLog
from app.models.store import Store
import logging

from typing import Optional

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/webhooks/whatsapp", tags=["WhatsApp Webhook"])

# Map Meta statuses → our internal statuses
STATUS_MAP = {
    "sent": "sent",
    "delivered": "sent",   # treat delivered as sent for simplicity
    "read": "read",
    "failed": "failed",
}


@router.get("")
async def whatsapp_webhook_verify(
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    store_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """
    Meta webhook verification handshake.
    Returns the challenge only if the verify token matches our secret.
    """
    from app.config import settings
    expected_token = settings.app_secret_key

    if store_id:
        result = await db.execute(select(Store).where(Store.id == store_id))
        store = result.scalars().first()
        if not store:
            logger.warning(f"WhatsApp webhook verification failed — unknown store_id={store_id}")
            return {"status": "forbidden"}

        if store.whatsapp_webhook_verify_token:
            expected_token = store.whatsapp_webhook_verify_token
        else:
            logger.info(
                f"WhatsApp webhook store {store_id} has no store-level verify token; falling back to global app secret"
            )

    if hub_mode == "subscribe" and hub_challenge and hub_verify_token == expected_token:
        logger.info(f"WhatsApp webhook verified successfully for store_id={store_id}")
        return int(hub_challenge)

    logger.warning("WhatsApp webhook verification failed — bad token or missing params")
    return {"status": "forbidden"}


@router.post("")
async def whatsapp_webhook_receive(
    request: Request,
    store_id: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Receive and process WhatsApp message status updates from Meta."""
    try:
        body = await request.json()
    except Exception:
        logger.warning("WhatsApp webhook: could not parse body")
        return {"status": "ok"}

    try:
        entries = body.get("entry", [])
        for entry in entries:
            for change in entry.get("changes", []):
                value = change.get("value", {})
                for status_obj in value.get("statuses", []):
                    msg_id = status_obj.get("id")
                    raw_status = status_obj.get("status")

                    if not msg_id or not raw_status:
                        continue

                    mapped_status = STATUS_MAP.get(raw_status, raw_status)
                    logger.info(f"WhatsApp status update: msg_id={msg_id} status={mapped_status} for store_id={store_id}")

                    result = await db.execute(
                        select(MessageLog).where(MessageLog.whatsapp_msg_id == msg_id)
                    )
                    message = result.scalars().first()
                    if message:
                        message.status = mapped_status
                        db.add(message)
                        continue

        await db.commit()
    except Exception as e:
        logger.error(f"Error processing WhatsApp webhook: {e}")
        # Always return 200 so Meta doesn't retry aggressively
    return {"status": "ok"}

