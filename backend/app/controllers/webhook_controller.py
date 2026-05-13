from fastapi import APIRouter, Request, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.services.salla_service import SallaService
from app.services.cart_service import CartService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])
cart_service = CartService()

@router.post("/salla")
async def salla_webhook(
    request: Request,
    x_salla_signature: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    payload_bytes = await request.body()
    
    is_valid = SallaService.verify_webhook_signature(payload_bytes, x_salla_signature)
    if not is_valid:
        logger.warning("Invalid Salla Webhook Signature")
        raise HTTPException(status_code=401, detail="Invalid signature")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event")
    
    if event == "order.abandoned":
        await cart_service.process_abandoned_cart(db, payload)
    
    return {"status": "success", "message": "Webhook received"}
