from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from uuid import UUID
import hmac
import hashlib
import json
from app.core.dependencies import get_db
from app.services.cart_service import CartService
from app.models.user import User
from app.models.store_settings import StoreSettings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/webhooks", tags=["Webhooks"])
cart_service = CartService()

@router.post("/salla")
async def salla_webhook(
    request: Request,
    user_id: UUID,
    x_salla_signature: str = Header(None),
    db: AsyncSession = Depends(get_db)
):
    # 1. Verify user exists
    user_res = await db.execute(select(User).where(User.id == user_id))
    user = user_res.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    # 2. Fetch StoreSettings for user
    settings_res = await db.execute(select(StoreSettings).where(StoreSettings.user_id == user.id))
    settings = settings_res.scalars().first()
    if not settings:
        raise HTTPException(status_code=404, detail="Store settings not configured for this user")
        
    # 3. Validate Webhook Signature
    body = await request.body()
    if not x_salla_signature:
        logger.warning("Missing x-salla-signature header")
        raise HTTPException(status_code=401, detail="Missing signature")
        
    secret = settings.salla_api_key.encode("utf-8")
    computed_signature = hmac.new(secret, body, hashlib.sha256).hexdigest()
    
    if computed_signature != x_salla_signature:
        logger.warning(f"Invalid Salla signature. Expected: {computed_signature}, Got: {x_salla_signature}")
        raise HTTPException(status_code=401, detail="Invalid signature")

    # 4. Parse payload and process
    try:
        payload = json.loads(body.decode("utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
        
    await cart_service.process_abandoned_cart(db, payload, str(user.id))
    
    return {"status": "success", "message": "Webhook received and validated"}
