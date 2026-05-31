from fastapi import APIRouter, Depends, HTTPException, Request, Header, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
import hmac
import hashlib
import json
from app.core.dependencies import get_db
from app.services.cart_service import CartService
from app.services.shipment_service import ShipmentService
from app.models.store import Store
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])
cart_service = CartService()
shipment_service = ShipmentService()

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
    elif action == "shipment_review":
        await shipment_service.process_shipment_event(db, payload, str(store.id))
    else:
        logger.info(f"Ignoring webhook event '{event_name}' because action '{action}' is not handled.")
        return {"status": "success", "message": f"Event '{event_name}' ignored"}

    return {"status": "success", "message": "Webhook received and validated"}

