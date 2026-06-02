from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID
from datetime import datetime

from app.core.dependencies import get_db, get_active_store
from app.models.store import Store
from app.repositories.review_repository import ReviewRepository
from app.schemas.review_schema import ReviewResponse, ReviewStatsResponse
from app.utils.date_helpers import parse_date_range

router = APIRouter(prefix="/api/v1/customer-reviews", tags=["reviews"])
review_repo = ReviewRepository()


class PaginatedReviewResponse:
    """Response wrapper for paginated reviews."""
    def __init__(self, data: List[ReviewResponse], total: int, skip: int, limit: int):
        self.data = data
        self.total = total
        self.skip = skip
        self.limit = limit
        self.pages = (total + limit - 1) // limit


@router.get("")
async def list_reviews(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store),
):
    """Get paginated list of reviews for the active store."""
    try:
        start_dt, end_dt = parse_date_range(start_date, end_date)

        reviews = await review_repo.get_all_with_pagination(
            db=db,
            store_id=active_store.id,
            skip=skip,
            limit=limit,
            start_date=start_dt,
            end_date=end_dt,
        )

        total = await review_repo.get_count(
            db=db,
            store_id=active_store.id,
            start_date=start_dt,
            end_date=end_dt,
        )

        return {
            "data": [ReviewResponse.model_validate(r) for r in reviews],
            "total": total,
            "skip": skip,
            "limit": limit,
            "pages": (total + limit - 1) // limit,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving reviews: {str(e)}")


@router.get("/{review_id}")
async def get_review(
    review_id: UUID,
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store),
):
    """Get a specific review by ID."""
    try:
        review = await review_repo.get_by_id(db, review_id)

        if not review:
            raise HTTPException(status_code=404, detail="Review not found")

        if review.store_id != active_store.id:
            raise HTTPException(status_code=403, detail="Not authorized to view this review")

        return ReviewResponse.model_validate(review)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving review: {str(e)}")


@router.get("/customer/{customer_id}")
async def get_customer_reviews(
    customer_id: UUID,
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store),
):
    """Get all reviews from a specific customer."""
    try:
        reviews = await review_repo.get_by_customer_id(
            db=db,
            customer_id=customer_id,
            store_id=active_store.id,
        )

        return [ReviewResponse.model_validate(r) for r in reviews]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving customer reviews: {str(e)}")


@router.get("/stats/overview")
async def get_review_stats(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store),
):
    """Get review statistics including average rating and distribution."""
    try:
        start_dt, end_dt = parse_date_range(start_date, end_date)

        total_reviews, avg_rating, rating_dist = await review_repo.get_rating_stats(
            db=db,
            store_id=active_store.id,
            start_date=start_dt,
            end_date=end_dt,
        )

        reviews_with_content = await review_repo.get_reviews_with_content_count(
            db=db,
            store_id=active_store.id,
            start_date=start_dt,
            end_date=end_dt,
        )

        return ReviewStatsResponse(
            total_reviews=total_reviews,
            average_rating=avg_rating,
            rating_distribution=rating_dist,
            reviews_with_content=reviews_with_content,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving review stats: {str(e)}")
