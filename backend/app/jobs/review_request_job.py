import logging
from app.core.database import AsyncSessionLocal
from app.services.review_service import ReviewService

logger = logging.getLogger(__name__)


async def run_review_request_job():
    """
    Background job to process and send pending review requests.
    Runs on a schedule to check for recovered carts that are eligible for review requests.
    """
    logger.info("Executing run_review_request_job...")
    async with AsyncSessionLocal() as db:
        try:
            review_service = ReviewService()
            await review_service.process_pending_review_requests(db)
            logger.info("Review request job completed successfully.")
        except Exception as e:
            logger.error(f"Error in background review request job: {str(e)}", exc_info=True)
