from pydantic import BaseModel
from typing import Optional, List, Dict
from uuid import UUID
from datetime import datetime


class ReviewWebhookPayload(BaseModel):
    """Schema for incoming review.added webhook from provider."""
    event: str
    merchant: int
    created_at: str
    data: dict


class ReviewBase(BaseModel):
    """Base fields for review responses."""
    review_type: str = "rating"
    rating: Optional[str] = None
    review_content: Optional[str] = None
    customer_name: Optional[str] = None
    customer_mobile: Optional[str] = None


class ReviewCreate(ReviewBase):
    """Schema for creating a new review from webhook."""
    store_id: UUID
    customer_id: UUID
    order_id: Optional[str] = None
    order_reference_id: Optional[str] = None
    product_id: Optional[str] = None
    merchant_id: Optional[str] = None
    recovered_cart_id: Optional[UUID] = None
    raw_payload: Optional[dict] = None
    reviewed_at: datetime


class ReviewResponse(ReviewBase):
    """Schema for review API responses."""
    id: UUID
    store_id: UUID
    customer_id: UUID
    recovered_cart_id: Optional[UUID] = None
    order_id: Optional[str] = None
    order_reference_id: Optional[str] = None
    product_id: Optional[str] = None
    merchant_id: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ReviewStatsResponse(BaseModel):
    """Schema for review statistics endpoint."""
    total_reviews: int
    average_rating: float
    rating_distribution: Dict[str, int]  # {"5": 10, "4": 5, "3": 2, "2": 1, "1": 0}
    reviews_with_content: int
