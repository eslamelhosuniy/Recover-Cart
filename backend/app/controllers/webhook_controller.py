from fastapi import APIRouter, Depends, HTTPException, Request, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional
from uuid import UUID
import hmac
import hashlib
import json
from app.core.dependencies import get_db
from app.services.cart_service import CartService
from app.services.review_service import ReviewService
from app.services.ghl_appointment_service import GHLAppointmentService
from app.models.store import Store
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])
cart_service = CartService()
review_service = ReviewService()
ghl_service = GHLAppointmentService()

@router.post("/salla")
async def salla_webhook(
    request: Request,
    store_id: UUID = Query(...),
    db: AsyncSession = Depends(get_db)
):
    # 1. Verify store exists
    store_res = await db.execute(select(Store).where(Store.id == store_id))
    store = store_res.scalars().first()
    if not store:
        raise HTTPException(status_code=404, detail="Store not found")
        
    body = await request.body()

    try:
        payload = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
    event_name = payload.get("event")
    from app.config import settings
    if not event_name or event_name not in settings.accepted_events:
        logger.info(f"Ignoring webhook event '{event_name}' (not registered or invalid in accepted_events).")
        return {"status": "success", "message": f"Event '{event_name}' ignored"}

    action = settings.accepted_events[event_name]
    if action == "recover_salla":
        await cart_service.process_abandoned_cart(db, payload, str(store.id))
    elif action == "review_webhook":
        await review_service.process_review_webhook(db, payload, str(store.id))
    else:
        logger.info(f"Ignoring webhook event '{event_name}' because action '{action}' is not handled.")
        return {"status": "success", "message": f"Event '{event_name}' ignored"}

    return {"status": "success", "message": "Webhook received and validated"}


@router.post("/ghl")
@router.post("/gohighlevel")
async def gohighlevel_webhook(
    request: Request,
    store_id: Optional[UUID] = Query(None),
    x_store_id: Optional[str] = Header(None, alias="X-Store-ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    GoHighLevel Calendar Webhook endpoint.
    Receives appointment booking data, creates/updates appointment, and triggers WhatsApp automations.
    """
    target_store_id = store_id
    if not target_store_id and x_store_id:
        try:
            target_store_id = UUID(x_store_id)
        except ValueError:
            pass

    body = await request.body()
    try:
        payload = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    # If store_id not provided in URL/Header, find active store
    if not target_store_id:
        store_res = await db.execute(select(Store).where(Store.is_active == True).limit(1))
        store = store_res.scalars().first()
        if not store:
            raise HTTPException(status_code=404, detail="No active store found to associate appointment")
        target_store_id = store.id
    else:
        store_res = await db.execute(select(Store).where(Store.id == target_store_id))
        store = store_res.scalars().first()
        if not store:
            raise HTTPException(status_code=404, detail=f"Store with id {target_store_id} not found")

    try:
        appointment = await ghl_service.process_ghl_webhook(
            db=db,
            payload=payload,
            store_id=target_store_id
        )
        return {
            "status": "success",
            "message": "GoHighLevel webhook received and processed successfully",
            "appointment_id": str(appointment.id) if appointment else None,
            "customer_name": appointment.customer_name if appointment else None,
            "status_type": appointment.status if appointment else None
        }
    except Exception as e:
        logger.error(f"Error processing GoHighLevel webhook: {str(e)}", exc_info=True)
        raise HTTPException(status_code=400, detail=f"Failed to process webhook: {str(e)}")


@router.get("/whatsapp")
async def verify_whatsapp_webhook(
    request: Request,
    store_id: Optional[UUID] = Query(None),
    hub_mode: Optional[str] = Query(None, alias="hub.mode"),
    hub_verify_token: Optional[str] = Query(None, alias="hub.verify_token"),
    hub_challenge: Optional[str] = Query(None, alias="hub.challenge"),
    db: AsyncSession = Depends(get_db)
):
    """
    Verification endpoint for Meta WhatsApp Cloud API Webhook.
    Handles GET challenge request when configuring Webhooks in Meta Dashboard.
    """
    logger.info(f"WhatsApp webhook verification: mode={hub_mode}, token={hub_verify_token}")
    
    if hub_mode != "subscribe" or not hub_verify_token:
        raise HTTPException(status_code=400, detail="Invalid verification request parameters")

    token_valid = False

    # 1. Check if specific store_id provided in query
    if store_id:
        store_res = await db.execute(select(Store).where(Store.id == store_id))
        store = store_res.scalars().first()
        if store and store.whatsapp_webhook_verify_token == hub_verify_token:
            token_valid = True

    # 2. Check all stores if token matches any store's verify token
    if not token_valid:
        store_res = await db.execute(select(Store).where(Store.whatsapp_webhook_verify_token == hub_verify_token))
        if store_res.scalars().first():
            token_valid = True

    # 3. Allow standard default token fallback
    if not token_valid and hub_verify_token in ["recover_cart_token", "whatsapp_secret_token_123"]:
        token_valid = True

    if token_valid:
        logger.info(f"WhatsApp webhook verification succeeded for challenge: {hub_challenge}")
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(content=hub_challenge or "")

    logger.warning("WhatsApp webhook verification token mismatch")
    raise HTTPException(status_code=403, detail="Verification token mismatch")


@router.post("/whatsapp")
async def whatsapp_webhook_events(
    request: Request,
    store_id: Optional[UUID] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """
    Receives WhatsApp delivery updates and message status receipts from Meta Cloud API.
    """
    body = await request.body()
    try:
        payload = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    logger.info(f"Received WhatsApp webhook event: {payload}")
    try:
        entries = payload.get("entry", [])
        for entry in entries:
            changes = entry.get("changes", [])
            for change in changes:
                value = change.get("value", {})
                statuses = value.get("statuses", [])
                for status_obj in statuses:
                    wamid = status_obj.get("id")
                    status_str = status_obj.get("status")
                    if wamid and status_str:
                        from app.models.message_log import MessageLog
                        from sqlalchemy import update
                        await db.execute(
                            update(MessageLog)
                            .where(MessageLog.whatsapp_msg_id == wamid)
                            .values(status=status_str)
                        )
                        await db.commit()
    except Exception as e:
        logger.error(f"Error handling WhatsApp status update: {e}")

    return {"status": "success"}


