from app.repositories.base_repository import BaseRepository
from app.models.customer_review import CustomerReview
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime
from uuid import UUID
import logging

logger = logging.getLogger(__name__)


class ReviewRepository(BaseRepository[CustomerReview]):
    def __init__(self):
        super().__init__(CustomerReview)

    async def get_by_order_id(self, db: AsyncSession, order_id: str, store_id: UUID) -> Optional[CustomerReview]:
        """Get review by order ID within a specific store."""
        result = await db.execute(
            select(self.model)
            .where(self.model.order_id == order_id)
            .where(self.model.store_id == store_id)
        )
        return result.scalars().first()

    async def get_latest_by_customer(self, db: AsyncSession, customer_id: UUID, store_id: UUID) -> Optional[CustomerReview]:
        """Get the most recent review from a customer."""
        result = await db.execute(
            select(self.model)
            .where(self.model.customer_id == customer_id)
            .where(self.model.store_id == store_id)
            .order_by(self.model.reviewed_at.desc())
            .limit(1)
        )
        return result.scalars().first()

    async def get_by_customer_id(self, db: AsyncSession, customer_id: UUID, store_id: UUID) -> List[CustomerReview]:
        """Get all reviews from a specific customer, ordered by newest first."""
        result = await db.execute(
            select(self.model)
            .where(self.model.customer_id == customer_id)
            .where(self.model.store_id == store_id)
            .order_by(self.model.reviewed_at.desc())
        )
        return result.scalars().all()

    async def get_all_with_pagination(
        self,
        db: AsyncSession,
        store_id: UUID,
        skip: int = 0,
        limit: int = 10,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[CustomerReview]:
        """Get paginated list of reviews with optional date filtering."""
        query = select(self.model).where(self.model.store_id == store_id)

        if start_date:
            query = query.where(self.model.reviewed_at >= start_date)
        if end_date:
            query = query.where(self.model.reviewed_at <= end_date)

        result = await db.execute(
            query.options(selectinload(self.model.customer))
            .options(selectinload(self.model.recovered_cart))
            .order_by(self.model.reviewed_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_count(
        self,
        db: AsyncSession,
        store_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> int:
        """Get total count of reviews with optional date filtering."""
        query = select(func.count(self.model.id)).where(self.model.store_id == store_id)

        if start_date:
            query = query.where(self.model.reviewed_at >= start_date)
        if end_date:
            query = query.where(self.model.reviewed_at <= end_date)

        result = await db.execute(query)
        return result.scalar() or 0

    async def get_rating_stats(
        self,
        db: AsyncSession,
        store_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> tuple[int, float, dict]:
        """
        Get review statistics: total_reviews, average_rating, and rating distribution.
        Returns (total_reviews, average_rating, rating_distribution)
        """
        query = select(self.model).where(self.model.store_id == store_id)

        if start_date:
            query = query.where(self.model.reviewed_at >= start_date)
        if end_date:
            query = query.where(self.model.reviewed_at <= end_date)

        result = await db.execute(query)
        all_reviews = result.scalars().all()

        total_reviews = len(all_reviews)

        # Calculate average rating
        ratings = []
        for review in all_reviews:
            if review.rating and review.rating.isdigit():
                ratings.append(float(review.rating))

        average_rating = sum(ratings) / len(ratings) if ratings else 0.0

        # Distribution by rating (1-5)
        rating_dist = {"5": 0, "4": 0, "3": 0, "2": 0, "1": 0}
        for review in all_reviews:
            if review.rating in rating_dist:
                rating_dist[review.rating] += 1

        return total_reviews, round(average_rating, 2), rating_dist

    async def get_reviews_with_content_count(
        self,
        db: AsyncSession,
        store_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> int:
        """Count reviews that have review_content text."""
        query = (
            select(func.count(self.model.id))
            .where(self.model.store_id == store_id)
            .where(self.model.review_content.isnot(None))
        )

        if start_date:
            query = query.where(self.model.reviewed_at >= start_date)
        if end_date:
            query = query.where(self.model.reviewed_at <= end_date)

        result = await db.execute(query)
        return result.scalar() or 0
