from datetime import datetime, timezone, timedelta
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.repositories import CustomerRepository, StoreRepository
from app.repositories.shipment_repository import ShipmentRepository
from app.repositories.shipment_message_repository import ShipmentMessageRepository
from app.schemas.customer_schema import CustomerCreate
from app.schemas.shipment_schema import ShipmentReviewCreate, ShipmentMessageCreate
from app.services.whatsapp_service import WhatsAppService

logger = logging.getLogger(__name__)


class ShipmentService:
    def __init__(self):
        self.shipment_repo = ShipmentRepository()
        self.shipment_message_repo = ShipmentMessageRepository()
        self.customer_repo = CustomerRepository()
        self.store_repo = StoreRepository()
        self.whatsapp_service = WhatsAppService()

    def _parse_datetime(self, raw_value: any) -> datetime | None:
        if not raw_value:
            return None

        if isinstance(raw_value, datetime):
            return raw_value if raw_value.tzinfo else raw_value.replace(tzinfo=timezone.utc)

        try:
            normalized = str(raw_value).replace("Z", "+00:00")
            parsed = datetime.fromisoformat(normalized)
            return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
        except ValueError:
            return None

    async def _ensure_customer(self, db: AsyncSession, customer_data: dict, store_id: str):
        if not customer_data:
            return None

        salla_customer_id = str(customer_data.get("id") or customer_data.get("customer_id") or "").strip()
        if not salla_customer_id:
            return None

        customer = await self.customer_repo.get_by_salla_id(db, salla_customer_id, store_id)
        if customer:
            return customer

        mobile = customer_data.get("mobile") or customer_data.get("phone") or ""
        mobile_code = customer_data.get("mobile_code") or customer_data.get("phone_code") or ""
        if not mobile:
            return None

        cust_in = CustomerCreate(
            salla_customer_id=salla_customer_id,
            full_name=f"{customer_data.get('name', '')}".strip() or "عميلنا العزيز",
            mobile=mobile,
            mobile_code=mobile_code,
            email=customer_data.get("email")
        )
        cust_data = cust_in.model_dump()
        cust_data["store_id"] = store_id
        return await self.customer_repo.create(db, cust_data)

    async def process_shipment_event(self, db: AsyncSession, payload: dict, store_id: str) -> None:
        event_type = payload.get("event")
        data = payload.get("data", {}) or {}
        shipment_data = data.get("shipment") or data

        salla_shipment_id = str(
            shipment_data.get("id")
            or shipment_data.get("shipment_id")
            or data.get("id")
            or ""
        ).strip()
        if not salla_shipment_id:
            logger.warning("Shipment webhook payload missing shipment identifier.")
            return

        customer_data = data.get("customer") or data.get("order", {}).get("customer") or {}
        customer = await self._ensure_customer(db, customer_data, store_id)
        if not customer:
            logger.warning(f"Shipment {salla_shipment_id} cannot be mapped to a customer for store {store_id}.")
            return

        order_id = str(
            shipment_data.get("order_id")
            or data.get("order_id")
            or data.get("order", {}).get("id")
            or ""
        ).strip() or None

        shipment_status = shipment_data.get("status") or data.get("status")
        tracking_number = (
            shipment_data.get("tracking_number")
            or shipment_data.get("tracking")
            or data.get("tracking_number")
        )
        shipped_at = self._parse_datetime(
            shipment_data.get("shipped_at")
            or shipment_data.get("created_at")
            or data.get("created_at")
        )
        delivered_at = self._parse_datetime(
            shipment_data.get("delivered_at")
            or data.get("delivered_at")
        )

        existing = await self.shipment_repo.get_by_salla_id(db, salla_shipment_id, store_id)
        payload_data = {
            "customer_id": customer.id,
            "order_id": order_id,
            "shipment_status": shipment_status,
            "tracking_number": tracking_number,
            "shipped_at": shipped_at,
            "delivered_at": delivered_at,
        }
        payload_data = {k: v for k, v in payload_data.items() if v is not None}

        if existing:
            await self.shipment_repo.update(db, existing, payload_data)
            logger.info(f"Updated shipment review record for shipment {salla_shipment_id}.")
            return

        shipment_in = ShipmentReviewCreate(
            salla_shipment_id=salla_shipment_id,
            customer_id=customer.id,
            order_id=order_id,
            shipment_status=shipment_status,
            tracking_number=tracking_number,
            shipped_at=shipped_at,
            delivered_at=delivered_at,
        )
        shipment_data = shipment_in.model_dump()
        shipment_data["store_id"] = store_id
        await self.shipment_repo.create(db, shipment_data)
        logger.info(f"Created shipment review record for shipment {salla_shipment_id}.")

    async def send_shipment_review(self, db: AsyncSession, shipment, store_settings) -> None:
        if shipment.review_sent:
            raise ValueError("تم إرسال طلب المراجعة مسبقاً لهذه الشحنة.")

        customer = await self.customer_repo.get_by_id(db, shipment.customer_id)
        if not customer or not customer.mobile:
            raise ValueError("لا يوجد رقم جوال صالح لعميل الشحنة.")

        from sqlalchemy import select
        from app.models.shipment_message_log import ShipmentMessageLog

        limit_time = datetime.now(timezone.utc) - timedelta(hours=24)
        stmt = (
            select(ShipmentMessageLog)
            .where(ShipmentMessageLog.shipment_id == shipment.id)
            .where(ShipmentMessageLog.sent_at >= limit_time)
            .where(ShipmentMessageLog.status.in_(["accepted", "sent"]))
            .limit(1)
        )
        existing_log = (await db.execute(stmt)).scalars().first()
        if existing_log:
            logger.info(f"Skipping duplicate shipment review for shipment {shipment.id}.")
            await self.shipment_repo.update(db, shipment, {"review_sent": True})
            raise ValueError("تم إرسال رسالة شحنة خلال الـ 24 ساعة الماضية.")

        review_url = f"https://reiash.com/review/{shipment.order_id}" if shipment.order_id else "https://reiash.com/review"
        customer_name = customer.full_name.split()[0] if customer.full_name else "عميلنا العزيز"

        components = [
            {
                "type": "body",
                "parameters": [
                    {"type": "name", "parameter_name": "name", "text": customer_name},
                    {"type": "text", "parameter_name": "order_id", "text": shipment.order_id or "طلبك"},
                ],
            },
            {
                "type": "button",
                "sub_type": "url",
                "index": "0",
                "parameters": [
                    {"type": "text", "text": review_url}
                ],
            },
        ]

        template_name = (
            store_settings.shipment_review_template_name
            or store_settings.whatsapp_template_name
            or "shipment_review"
        )
        full_phone = f"{customer.mobile}"

        try:
            response = await self.whatsapp_service.send_template_message(
                to_phone=full_phone,
                template_name=template_name,
                whatsapp_phone_id=store_settings.whatsapp_phone_id,
                whatsapp_token=store_settings.whatsapp_access_token,
                components=components,
            )

            msg_id = response.get("messages", [{}])[0].get("id")
            message_in = ShipmentMessageCreate(
                shipment_id=shipment.id,
                whatsapp_msg_id=msg_id,
                status="accepted",
                channel="whatsapp",
            )
            msg_data = message_in.model_dump()
            msg_data["store_id"] = shipment.store_id
            await self.shipment_message_repo.create(db, msg_data)
            await self.shipment_repo.update(db, shipment, {"review_sent": True})
        except Exception as e:
            message_in = ShipmentMessageCreate(
                shipment_id=shipment.id,
                status="failed",
                channel="whatsapp",
            )
            msg_data = message_in.model_dump()
            msg_data["store_id"] = shipment.store_id
            created_msg = await self.shipment_message_repo.create(db, msg_data)
            await self.shipment_message_repo.update(db, created_msg, {"error_message": str(e)})
            logger.error(f"Failed to send shipment review for shipment {shipment.id}: {str(e)}")
            raise
