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
import logging

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
):
    """
    Meta webhook verification handshake.
    Returns the challenge if verification passes.
    """
    # Accept any verify token for now; tighten in production
    if hub_mode == "subscribe" and hub_challenge:
        logger.info("WhatsApp webhook verified successfully")
        return int(hub_challenge)
    return {"status": "ok"}


@router.post("")
async def whatsapp_webhook_receive(
    request: Request,
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
                    logger.info(f"WhatsApp status update: msg_id={msg_id} status={mapped_status}")

                    result = await db.execute(
                        select(MessageLog).where(MessageLog.whatsapp_msg_id == msg_id)
                    )
                    message = result.scalars().first()
                    if message:
                        message.status = mapped_status
                        db.add(message)

        await db.commit()
    except Exception as e:
        logger.error(f"Error processing WhatsApp webhook: {e}")
        # Always return 200 so Meta doesn't retry aggressively
    return {"status": "ok"}
