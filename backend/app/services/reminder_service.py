from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from datetime import datetime, timezone, timedelta
import logging

from app.repositories import CartRepository, MessageRepository, CustomerRepository, StoreRepository
from app.services.whatsapp_service import WhatsAppService
from app.models.abandoned_cart import AbandonedCart
from app.models.store import Store
from app.schemas import MessageCreate
from app.config import settings

logger = logging.getLogger(__name__)

class ReminderService:
    def __init__(self):
        self.cart_repo = CartRepository()
        self.message_repo = MessageRepository()
        self.customer_repo = CustomerRepository()
        self.store_repo = StoreRepository()
        self.whatsapp_service = WhatsAppService()

    async def process_pending_reminders(self, db: AsyncSession) -> None:
        logger.info("Starting scheduled reminder processing...")
        
        result = await db.execute(
            select(AbandonedCart)
            .join(Store, AbandonedCart.store_id == Store.id)
            .where(
                and_(
                    AbandonedCart.reminder_sent == False,
                    AbandonedCart.is_recovered == False,
                    AbandonedCart.event_type.startswith("abandoned"),
                    Store.automation_enabled == True
                )
            )
        )
        
        pending_carts = result.scalars().all()
        logger.info(f"Found {len(pending_carts)} carts pending for reminders check.")

        for cart in pending_carts:
            store_settings = await self.store_repo.get_by_id(db, cart.store_id)
            if not store_settings:
                continue
            
            threshold_time = datetime.now(timezone.utc) - timedelta(hours=settings.reminder_delay_hours)
            
            if cart.abandoned_at <= threshold_time:
                try:
                    await self.send_reminder_for_cart(db, cart, store_settings)
                except Exception as e:
                    logger.warning(f"Skipping cart {cart.id} in batch: {str(e)}")


    async def send_reminder_for_cart(self, db: AsyncSession, cart: AbandonedCart, store_settings: Store = None) -> None:
        if cart.is_recovered:
            raise ValueError("هذه السلة مسترجعة بالفعل (تم شراؤها)، ولا يمكن إرسال رسالة تذكيرية لها.")

        if not store_settings:
            store_settings = await self.store_repo.get_by_id(db, cart.store_id)
            
        if not store_settings:
            raise ValueError("لا توجد إعدادات متجر مكونة. يرجى إعداد الإعدادات أولاً.")

        customer = await self.customer_repo.get_by_id(db, cart.customer_id)
        
        if not customer or not customer.mobile:
            raise ValueError("لا يوجد رقم جوال صالح لهذا العميل.")
        if cart.reminder_sent:
            raise ValueError("لقد تم تنبيه هذه السلة من قبل")
            
        # Don't send if a message was sent to this customer in the last 24 hours
        from datetime import datetime, timedelta, timezone
        from sqlalchemy import select
        from app.models.message_log import MessageLog
        
        limit_time = datetime.now(timezone.utc) - timedelta(hours=24)
        stmt = (
            select(MessageLog)
            .join(AbandonedCart, MessageLog.cart_id == AbandonedCart.id)
            .where(AbandonedCart.customer_id == cart.customer_id)
            .where(MessageLog.sent_at >= limit_time)
            .where(MessageLog.status.in_(["accepted", "sent"]))
            .limit(1)
        )
        existing_log = (await db.execute(stmt)).scalars().first()
        if existing_log:
            logger.info(f"Skipping reminder for cart {cart.id} - customer received a message in the last 24 hours.")
            if not cart.reminder_sent:
                await self.cart_repo.update(db, cart, {"reminder_sent": True})
            raise ValueError("تم إرسال رسالة لهذا العميل خلال آخر 24 ساعة. لا يمكن الإرسال مجدداً.")

        full_phone = f"{customer.mobile}"
        
        try:
            customer_name = customer.full_name.split()[0] if customer.full_name else "عميلنا العزيز"
            checkout_url = cart.checkout_url or "https://reiash.com/cart"

            # Extract only the path/suffix of the URL using split('/')
            if "://" in checkout_url:
                checkout_button_param = "/".join(checkout_url.split('/')[3:])
            else:
                checkout_button_param = checkout_url

            components = []
            
            # Add header with image only if reminder_image_url is set
            if store_settings.reminder_image_url:
                components.append({
                    "type": "header",
                    "parameters": [
                        {
                            "type": "text",
                            "parameter_name": "name",
                            "text": customer_name
                        }
                    ]
                })

            
            # Build body parameters dynamically
            body_parameters = [

            ]

            
            
            # Add coupon only if coupon_code is set
            if store_settings.coupon_code:
                body_parameters.append({
                    "type": "text",
                    "parameter_name": "cupon",
                    "text": store_settings.coupon_code
                })
            
            components.append({
                "type": "body",
                "parameters": body_parameters
            })
            
            # Add button component
            components.append({
                "type": "button",
                "sub_type": "url",
                "index": "0",
                "parameters": [
                    {
                        "type": "text",
                        "text": checkout_button_param
                    }
                ]
            })

            response = await self.whatsapp_service.send_template_message(
                to_phone=full_phone,
                template_name=store_settings.whatsapp_template_name or "hello_world",
                whatsapp_phone_id=store_settings.whatsapp_phone_id,
                whatsapp_token=store_settings.whatsapp_access_token,
                components=components
            )
            
            msg_id = response.get("messages", [{}])[0].get("id")
            message_status = response.get("messages",[{}])[0].get('message_status')
            msg_in = MessageCreate(
                cart_id=cart.id,
                whatsapp_msg_id=msg_id,
                status=message_status,
                channel="whatsapp",
                message_type="abandoned_reminder"
            )
            msg_data = msg_in.model_dump()
            msg_data["store_id"] = cart.store_id
            await self.message_repo.create(db, msg_data)
            await self.cart_repo.update(db, cart, {"reminder_sent": True})
            
        except Exception as e:
            msg_in = MessageCreate(
                cart_id=cart.id,
                status="failed",
                channel="whatsapp",
                message_type="abandoned_reminder"
            )
            msg_data = msg_in.model_dump()
            msg_data["store_id"] = cart.store_id
            created_msg = await self.message_repo.create(db, msg_data)
            await self.message_repo.update(db, created_msg, {"error_message": str(e)})
            logger.error(f"Failed to process reminder for cart {cart.id}: {str(e)}")
            raise  # re-raise so the controller can return the correct error to the client

