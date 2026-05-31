from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime


class ShipmentReviewBase(BaseModel):
    order_id: Optional[str] = None
    shipment_status: Optional[str] = None
    tracking_number: Optional[str] = None
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    review_sent: bool = False


class ShipmentReviewCreate(ShipmentReviewBase):
    salla_shipment_id: str
    customer_id: UUID


class ShipmentReviewResponse(ShipmentReviewBase):
    id: UUID
    store_id: UUID
    customer_id: UUID
    salla_shipment_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class ShipmentMessageBase(BaseModel):
    status: str = "pending"
    channel: str = "whatsapp"


class ShipmentMessageCreate(ShipmentMessageBase):
    shipment_id: UUID
    whatsapp_msg_id: Optional[str] = None


class ShipmentMessageResponse(ShipmentMessageBase):
    id: UUID
    store_id: UUID
    shipment_id: UUID
    whatsapp_msg_id: Optional[str] = None
    sent_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    error_message: Optional[str] = None

    model_config = {"from_attributes": True}


class ShipmentStatsResponse(BaseModel):
    total_shipments: int
    delivered_shipments: int
    review_requests_sent: int
    pending_review_shipments: int
    failed_review_messages: int
