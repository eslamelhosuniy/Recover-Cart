from fastapi import APIRouter, Depends, HTTPException, Request, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
import hmac
import hashlib
import json
from app.core.dependencies import get_db
from app.services.cart_service import CartService
from app.models.store import Store
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])
cart_service = CartService()

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
    if not event_name or event_name not in settings.accepted_events or settings.accepted_events[event_name] != "recover_salla":
        logger.info(f"Ignoring webhook event '{event_name}' (not registered or invalid in accepted_events).")
        return {"status": "success", "message": f"Event '{event_name}' ignored"}
        
    await cart_service.process_abandoned_cart(db, payload, str(store.id))
    
    return {"status": "success", "message": "Webhook received and validated"}

