from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from datetime import datetime, timezone
import logging
import json
from typing import Optional
from uuid import UUID

from app.repositories.review_repository import ReviewRepository
from app.repositories.customer_repository import CustomerRepository
from app.repositories.recovered_cart_repository import RecoveredCartRepository
from app.repositories.store_repository import StoreRepository
from app.schemas.review_schema import ReviewCreate, ReviewWebhookPayload
from app.services.whatsapp_service import WhatsAppService
from app.models.customer_review import CustomerReview
from app.models.recovered_cart import RecoveredCart
from app.models.store import Store
from app.core.exceptions import NotFoundException, ValidationException

logger = logging.getLogger(__name__)


class ReviewService:
    def __init__(self):
        self.review_repo = ReviewRepository()
        self.customer_repo = CustomerRepository()
        self.recovered_cart_repo = RecoveredCartRepository()
        self.store_repo = StoreRepository()
        self.whatsapp_service = WhatsAppService()

    async def process_review_webhook(
        self, db: AsyncSession, payload: dict, store_id: str
    ) -> Optional[CustomerReview]:
        """
        Process incoming review.added webhook from provider.

        Flow:
        1. Parse and validate webhook payload
        2. Extract customer ID from payload
        3. Find customer in database
        4. Find latest recovered cart for this customer (where is_recovered=true)
        5. Link review to recovered cart if found
        6. Save review to database
        """
        try:
            # Step 1: Parse webhook payload
            webhook = ReviewWebhookPayload(**payload)
            logger.info(f"Processing review webhook for merchant {webhook.merchant}")

            # Step 2: Extract customer data from payload
            customer_data = webhook.data.get("customer", {})
            customer_salla_id = customer_data.get("id")
            customer_name = customer_data.get("name")
            customer_mobile = customer_data.get("mobile")

            if not customer_salla_id:
                logger.warning("Review webhook missing customer ID")
                raise ValidationException("Customer ID required in webhook payload")

            # Step 3: Find customer in our database
            customer = await self.customer_repo.get_by_salla_id(db, customer_salla_id, store_id)
            if not customer:
                logger.warning(f"Customer {customer_salla_id} not found in database, skipping review")
                # Save review anyway with customer_id=None and customer_name from payload
                return await self._save_orphaned_review(db, payload, store_id)

            # Step 4: Find latest recovered cart for this customer
            recovered_cart_id = await self._find_latest_recovered_cart(db, customer.id, store_id)

            # Step 5: Extract order and product data
            order_data = webhook.data.get("order", {})
            product_data = webhook.data.get("product", {})
            rating = str(webhook.data.get("rating", ""))
            review_content = webhook.data.get("content", "")

            # Step 6: Create review record
            review_create = ReviewCreate(
                store_id=UUID(store_id),
                customer_id=customer.id,
                customer_name=customer_name,
                customer_mobile=customer_mobile,
                merchant_id=str(webhook.merchant),
                order_id=order_data.get("id"),
                order_reference_id=order_data.get("reference_id"),
                product_id=product_data.get("id"),
                rating=rating,
                review_content=review_content,
                review_type=webhook.data.get("type", "rating"),
                recovered_cart_id=recovered_cart_id,
                raw_payload=webhook.model_dump(),
                reviewed_at=datetime.now(timezone.utc),
            )

            # Step 7: Save review to database
            review = await self.review_repo.create(db, review_create)
            logger.info(f"Review saved: {review.id} for customer {customer.id}")

            return review

        except ValidationException as e:
            logger.error(f"Validation error processing review: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"Error processing review webhook: {str(e)}", exc_info=True)
            raise

    async def _find_latest_recovered_cart(
        self, db: AsyncSession, customer_id: UUID, store_id: str
    ) -> Optional[UUID]:
        """
        Find the latest recovered cart for a customer where is_recovered=true.

        Uses most recent recovered_at timestamp.
        """
        try:
            store_uuid = UUID(store_id)
            cart = await self.recovered_cart_repo.get_latest_by_customer(db, customer_id, store_uuid)

            if cart and cart.is_recovered:
                logger.info(f"Linked review to recovered cart {cart.id}")
                return cart.id

            logger.debug(f"No active recovered cart found for customer {customer_id}")
            return None

        except Exception as e:
            logger.error(f"Error finding recovered cart: {str(e)}")
            return None

    async def _save_orphaned_review(
        self, db: AsyncSession, payload: dict, store_id: str
    ) -> Optional[CustomerReview]:
        """
        Save review when customer not found in database.

        Sets customer_id=None and uses customer name from payload.
        """
        try:
            webhook = ReviewWebhookPayload(**payload)
            customer_data = webhook.data.get("customer", {})
            order_data = webhook.data.get("order", {})
            product_data = webhook.data.get("product", {})

            review_create = ReviewCreate(
                store_id=UUID(store_id),
                customer_id=None,  # Will be handled as optional
                customer_name=customer_data.get("name"),
                customer_mobile=customer_data.get("mobile"),
                merchant_id=str(webhook.merchant),
                order_id=order_data.get("id"),
                order_reference_id=order_data.get("reference_id"),
                product_id=product_data.get("id"),
                rating=str(webhook.data.get("rating", "")),
                review_content=webhook.data.get("content", ""),
                review_type=webhook.data.get("type", "rating"),
                recovered_cart_id=None,
                raw_payload=webhook.model_dump(),
                reviewed_at=datetime.now(timezone.utc),
            )

            review = await self.review_repo.create(db, review_create)
            logger.warning(f"Saved orphaned review {review.id} (customer not found)")
            return review

        except Exception as e:
            logger.error(f"Error saving orphaned review: {str(e)}")
            return None

    async def schedule_review_request(
        self, db: AsyncSession, store_id: UUID, customer_id: UUID, recovered_cart_id: UUID
    ) -> bool:
        """
        Schedule a review request to be sent after the configured delay.

        Called when a recovered cart is created (cart purchased).
        The scheduler job will handle actual WhatsApp sending.
        """
        try:
            store = await self.store_repo.get_by_id(db, store_id)
            if not store or not store.review_request_enabled:
                logger.debug(f"Review requests disabled for store {store_id}")
                return False

            customer = await self.customer_repo.get_by_id(db, customer_id)
            if not customer or not customer.phone:
                logger.warning(f"Customer {customer_id} has no phone number, skipping review request")
                return False

            logger.info(
                f"Scheduled review request for customer {customer_id}, "
                f"recovered_cart {recovered_cart_id}, delay: {store.review_request_delay_hours}h"
            )
            # Note: Actual sending is handled by scheduler job (process_pending_review_requests)
            return True

        except Exception as e:
            logger.error(f"Error scheduling review request: {str(e)}")
            return False

    async def send_review_request(
        self, db: AsyncSession, customer_id: UUID, recovered_cart_id: UUID, store_id: UUID
    ) -> bool:
        """
        Send WhatsApp review request message to customer.

        Called by scheduler when delay period has elapsed.
        """
        try:
            from app.models.message_log import MessageLog
            from app.repositories.message_repository import MessageRepository
            
            customer = await self.customer_repo.get_by_id(db, customer_id)
            store = await self.store_repo.get_by_id(db, store_id)
            recovered_cart = await self.recovered_cart_repo.get_by_id(db, recovered_cart_id)

            if not customer or not customer.phone:
                logger.warning(f"Customer {customer_id} missing phone, cannot send review request")
                return False

            if not store or not store.review_request_enabled:
                logger.debug(f"Review requests disabled for store {store_id}")
                return False

            if not recovered_cart:
                logger.warning(f"Recovered cart {recovered_cart_id} not found")
                return False

            # Send WhatsApp template message with review request
            template_name = store.review_request_template_name or "review_request"
            response = await self.whatsapp_service.send_template_message(
                to_phone=customer.phone,
                template_name=template_name,
                whatsapp_phone_id=store.whatsapp_phone_id,
                whatsapp_token=store.whatsapp_access_token,
            )

            msg_id = response.get("messages", [{}])[0].get("id")
            
            # Log the message
            msg_log = MessageLog(
                store_id=store_id,
                cart_id=recovered_cart.cart_id,
                whatsapp_msg_id=msg_id,
                status="sent",
                channel="whatsapp",
                message_type="review_reminder"
            )
            db.add(msg_log)
            await db.commit()

            logger.info(f"Review request sent to customer {customer_id}")
            return True

        except Exception as e:
            logger.error(f"Error sending review request: {str(e)}")
            return False

    async def process_pending_review_requests(self, db: AsyncSession) -> None:
        """
        Process and send pending review requests for recovered carts.
        
        Finds recovered carts where:
        - Store has review_request_enabled=True
        - Recovered cart was created more than review_request_delay_hours ago
        - No review request message has been sent yet
        """
        from datetime import datetime, timezone, timedelta
        from sqlalchemy import and_
        from app.models.message_log import MessageLog
        
        logger.info("Starting scheduled review request processing...")
        
        try:
            # Query all stores with review requests enabled
            result = await db.execute(
                select(Store).where(Store.review_request_enabled == True)
            )
            stores = result.scalars().all()
            
            if not stores:
                logger.info("No stores have review requests enabled")
                return
            
            for store in stores:
                try:
                    # Find recovered carts created more than delay_hours ago
                    threshold_time = datetime.now(timezone.utc) - timedelta(hours=store.review_request_delay_hours)
                    
                    # Get recovered carts for this store
                    result = await db.execute(
                        select(RecoveredCart)
                        .where(RecoveredCart.store_id == store.id)
                        .where(RecoveredCart.created_at <= threshold_time)
                    )
                    recovered_carts = result.scalars().all()
                    
                    logger.info(f"Found {len(recovered_carts)} recovered carts for store {store.id} pending review requests")
                    
                    for recovered_cart in recovered_carts:
                        try:
                            # Check if review request message was already sent
                            msg_result = await db.execute(
                                select(MessageLog)
                                .where(MessageLog.cart_id == recovered_cart.cart_id)
                                .where(MessageLog.channel == "whatsapp")
                            )
                            existing_msg = msg_result.scalars().first()
                            
                            if existing_msg:
                                logger.debug(f"Review request already sent for cart {recovered_cart.cart_id}")
                                continue
                            
                            # Get the cart details
                            from app.models.abandoned_cart import AbandonedCart
                            cart_result = await db.execute(
                                select(AbandonedCart).where(AbandonedCart.id == recovered_cart.cart_id)
                            )
                            cart = cart_result.scalars().first()
                            
                            if not cart:
                                logger.warning(f"Cart {recovered_cart.cart_id} not found")
                                continue
                            
                            # Send review request
                            success = await self.send_review_request(
                                db=db,
                                customer_id=cart.customer_id,
                                recovered_cart_id=recovered_cart.id,
                                store_id=store.id
                            )
                            
                            if success:
                                logger.info(f"Review request sent for recovered cart {recovered_cart.id}")
                            else:
                                logger.warning(f"Failed to send review request for recovered cart {recovered_cart.id}")
                        
                        except Exception as e:
                            logger.error(f"Error processing review request for cart {recovered_cart.id}: {str(e)}")
                
                except Exception as e:
                    logger.error(f"Error processing review requests for store {store.id}: {str(e)}")
        
        except Exception as e:
            logger.error(f"Error in process_pending_review_requests: {str(e)}")

