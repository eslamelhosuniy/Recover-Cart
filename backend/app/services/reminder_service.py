from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from datetime import datetime, timezone, timedelta
import logging

from app.repositories import CartRepository, MessageRepository, CustomerRepository
from app.services.whatsapp_service import WhatsAppService
from app.models.abandoned_cart import AbandonedCart
from app.schemas import MessageCreate
from app.config import settings

logger = logging.getLogger(__name__)

class ReminderService:
    def __init__(self):
        self.cart_repo = CartRepository()
        self.message_repo = MessageRepository()
        self.customer_repo = CustomerRepository()
        self.whatsapp_service = WhatsAppService()

    async def process_pending_reminders(self, db: AsyncSession) -> None:
        logger.info("Starting scheduled reminder processing...")
        
        threshold_time = datetime.now(timezone.utc) - timedelta(hours=settings.reminder_delay_hours)
        
        result = await db.execute(
            select(AbandonedCart)
            .where(
                and_(
                    AbandonedCart.reminder_sent == False,
                    AbandonedCart.is_recovered == False,
                    AbandonedCart.abandoned_at <= threshold_time,
                    AbandonedCart.event_type.startswith("abandoned")
                )
            )
        )
        
        pending_carts = result.scalars().all()
        logger.info(f"Found {len(pending_carts)} carts pending for reminders.")

        for cart in pending_carts:
            await self._send_reminder_for_cart(db, cart)

    async def send_manual_reminder(self, db: AsyncSession, cart_id) -> None:
        cart = await self.cart_repo.get_by_id(db, cart_id)
        if not cart:
            raise Exception("Cart not found")
        await self._send_reminder_for_cart(db, cart)

    async def _send_reminder_for_cart(self, db: AsyncSession, cart: AbandonedCart) -> None:
        customer = await self.customer_repo.get_by_id(db, cart.customer_id)
        
        if not customer or not customer.mobile:
            logger.warning(f"No valid mobile for cart {cart.id}")
            return

        full_phone = f"{customer.mobile_code}{customer.mobile}"
        
        try:
            customer_name = customer.full_name.split()[0] if customer.full_name else "عميلنا العزيز"
            checkout_url = cart.checkout_url or "https://reiash.com/cart"
            coupon = settings.coupon_code or "رياشن للمفروشات"

            components = [
                {
                    "type": "header",
                    "parameters": [
                        {
                            "type": "text",
                            "text": customer_name
                        }
                    ]
                },
                {
                    "type": "body",
                    "parameters": [
                        {
                            "type": "text",
                            "text": coupon
                        }
                    ]
                },
                {
                    "type": "button",
                    "sub_type": "url",
                    "index": "0",
                    "parameters": [
                        {
                            "type": "text",
                            "text": checkout_url
                        }
                    ]
                }
            ]

            response = await self.whatsapp_service.send_template_message(
                to_phone=full_phone,
                template_name=settings.whatsapp_template_name,
                components=components
            )
            
            msg_id = response.get("messages", [{}])[0].get("id")
            msg_in = MessageCreate(
                cart_id=cart.id,
                whatsapp_msg_id=msg_id,
                status="accepted",
                channel="whatsapp"
            )
            await self.message_repo.create(db, msg_in.model_dump())
            await self.cart_repo.update(db, cart, {"reminder_sent": True})
            
        except Exception as e:
            msg_in = MessageCreate(
                cart_id=cart.id,
                status="failed",
                channel="whatsapp"
            )
            created_msg = await self.message_repo.create(db, msg_in.model_dump())
            await self.message_repo.update(db, created_msg, {"error_message": str(e)})
            logger.error(f"Failed to process reminder for cart {cart.id}: {str(e)}")
