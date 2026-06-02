from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.cart_repository import CartRepository
from app.repositories.customer_repository import CustomerRepository
from app.schemas.cart_schema import CartCreate
from app.schemas.customer_schema import CustomerCreate
import logging
from datetime import datetime, timezone
from sqlalchemy.future import select
from app.models.abandoned_cart import AbandonedCart
from app.models.recovered_cart import RecoveredCart
from uuid import UUID

logger = logging.getLogger(__name__)

class CartService:
    def __init__(self):
        self.cart_repo = CartRepository()
        self.customer_repo = CustomerRepository()
        # Import here to avoid circular imports
        from app.services.review_service import ReviewService
        self.review_service = ReviewService()

    async def process_abandoned_cart(self, db: AsyncSession, payload: dict, store_id: str) -> None:
        try:
            event_type = payload.get("event")

            data = payload.get("data", {})
            customer_data = data.get("customer", {})
            
            salla_customer_id = str(customer_data.get("id"))
            
            if event_type == "abandoned.cart.purchased":
                salla_cart_id = str(data.get("id"))
                cart_res = await db.execute(
                    select(AbandonedCart)
                    .where(AbandonedCart.salla_cart_id == salla_cart_id)
                    .where(AbandonedCart.store_id == store_id)
                )
                cart = cart_res.scalars().first()
                if cart:
                    if not cart.is_recovered:
                        cart.is_recovered = True
                        cart.recovered_at = datetime.now(timezone.utc)
                        db.add(cart)
                        
                        # Create recovered cart details
                        total_amt = float(data.get("total", 0.0))
                        subtotal_amt = float(data.get("subtotal", 0.0))
                        discount_amt = float(data.get("total_discount", 0.0))
                        
                        recovered = RecoveredCart(
                            cart_id=cart.id,
                            store_id=store_id,
                            status=data.get("status", "purchased"),
                            currency=data.get("currency", "SAR"),
                            total=total_amt,
                            subtotal=subtotal_amt,
                            total_discount=discount_amt
                        )
                        db.add(recovered)
                        await db.commit()
                        
                        # Schedule review request for this recovered cart
                        try:
                            await self.review_service.schedule_review_request(
                                db=db,
                                store_id=UUID(store_id),
                                customer_id=cart.customer_id,
                                recovered_cart_id=recovered.id,
                            )
                        except Exception as e:
                            logger.error(f"Error scheduling review request: {str(e)}")
                        
                        logger.info(f"Successfully processed purchased cart: {salla_cart_id}")
                    else:
                        logger.info(f"Cart {salla_cart_id} already marked as recovered.")
                else:
                    logger.warning(f"Received purchase event for unknown cart {salla_cart_id}.")
                return

            # For abandoned.cart / abandoned.cart.update
            customer = await self.customer_repo.get_by_salla_id(db, salla_customer_id, store_id)
            if not customer:
                cust_in = CustomerCreate(
                    salla_customer_id=salla_customer_id,
                    full_name=f"{customer_data.get('name', '')}".strip(),
                    mobile=customer_data.get("mobile", ""),
                    mobile_code=customer_data.get("mobile_code", ""),
                    email=customer_data.get("email")
                )
                cust_data = cust_in.model_dump()
                cust_data["store_id"] = store_id
                customer = await self.customer_repo.create(db, cust_data)

            salla_cart_id = str(data.get("id"))
            cart = await self.cart_repo.get_by_salla_id(db, salla_cart_id, store_id)
            
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
                cart_data = cart_in.model_dump()
                cart_data["store_id"] = store_id
                await self.cart_repo.create(db, cart_data)
                logger.info(f"Successfully processed abandoned cart: {salla_cart_id}")
            else:
                logger.info(f"Cart {salla_cart_id} already exists. Ignoring.")
                
        except Exception as e:
            logger.error(f"Error processing abandoned cart: {str(e)}")
            raise
