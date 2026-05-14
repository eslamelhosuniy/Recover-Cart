from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Dict, Any
from app.core.dependencies import get_db
from app.services.cart_service import CartService
from app.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])
cart_service = CartService()

@router.post("/salla")
async def salla_webhook(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    event = payload.get("event")
    
    # if event == settings.event_name:
    await cart_service.process_abandoned_cart(db, payload)
    
    return {"status": "success", "message": "Webhook received"}
