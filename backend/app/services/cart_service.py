from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.cart_repository import CartRepository
from app.repositories.customer_repository import CustomerRepository
from app.schemas.cart_schema import CartCreate
from app.schemas.customer_schema import CustomerCreate
from app.config import settings
import logging
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

class CartService:
    def __init__(self):
        self.cart_repo = CartRepository()
        self.customer_repo = CustomerRepository()

    async def process_abandoned_cart(self, db: AsyncSession, payload: dict) -> None:
        try:
            event_type = payload.get("event")
            # if event_type != settings.event_name:
            #     return

            data = payload.get("data", {})
            customer_data = data.get("customer", {})
            
            salla_customer_id = str(customer_data.get("id"))
            
            customer = await self.customer_repo.get_by_salla_id(db, salla_customer_id)
            if not customer:
                cust_in = CustomerCreate(
                    salla_customer_id=salla_customer_id,
                    full_name=f"{customer_data.get('name', '')}".strip(),
                    mobile=customer_data.get("mobile", ""),
                    mobile_code=customer_data.get("mobile_code", ""),
                    email=customer_data.get("email")
                )
                customer = await self.customer_repo.create(db, cust_in.model_dump())
            else:
                await self.customer_repo.update(db, customer, {"total_carts": customer.total_carts + 1})

            salla_cart_id = str(data.get("id"))
            cart = await self.cart_repo.get_by_salla_id(db, salla_cart_id)
            
            if not cart:
                cart_value = 0.0
                try:
                    total = data.get("total")
                    if isinstance(total, dict):
                        cart_value = float(total.get("amount", 0.0))
                    elif total is not None:
                        cart_value = float(total)
                    else:
                        amounts = data.get("amounts", {})
                        if isinstance(amounts, dict):
                            amt_total = amounts.get("total")
                            if isinstance(amt_total, dict):
                                cart_value = float(amt_total.get("amount", 0.0))
                            elif amt_total is not None:
                                cart_value = float(amt_total)
                except (ValueError, TypeError):
                    pass

                cart_in = CartCreate(
                    salla_cart_id=salla_cart_id,
                    cart_value=cart_value,
                    event_type=event_type,
                    customer_id=customer.id,
                    abandoned_at=datetime.now(timezone.utc),
                    checkout_url=data.get("checkout_url")
                )
                await self.cart_repo.create(db, cart_in.model_dump())
                logger.info(f"Successfully processed abandoned cart: {salla_cart_id}")
            else:
                logger.info(f"Cart {salla_cart_id} already exists. Ignoring.")
                
        except Exception as e:
            logger.error(f"Error processing abandoned cart: {str(e)}")
            raise
