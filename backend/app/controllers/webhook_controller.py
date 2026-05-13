from fastapi import APIRouter, Request, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.services.cart_service import CartService
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])
cart_service = CartService()

@router.post("/salla")
async def salla_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")

    event = payload.get("event")
    
    if event == "order.abandoned":
        await cart_service.process_abandoned_cart(db, payload)
    
    return {"status": "success", "message": "Webhook received"}
