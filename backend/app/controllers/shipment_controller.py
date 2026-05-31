from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Optional
from app.core.dependencies import get_db, get_active_store
from app.models.store import Store
from app.models.shipment_review import ShipmentReview
from app.models.shipment_message_log import ShipmentMessageLog
from app.schemas.shipment_schema import ShipmentReviewResponse, ShipmentStatsResponse
from app.schemas.common import PaginatedResponse
from app.utils.date_helpers import parse_date_range

router = APIRouter(prefix="/api/v1/shipments", tags=["Shipments"])

MAX_LIMIT = 100


@router.get("", response_model=PaginatedResponse[ShipmentReviewResponse])
async def get_shipments(
    skip: int = 0,
    limit: int = 10,
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store),
):
    limit = min(limit, MAX_LIMIT)
    start_dt, end_dt = parse_date_range(start_date, end_date)

    query = (
        select(ShipmentReview)
        .where(ShipmentReview.store_id == active_store.id)
    )
    if start_dt:
        query = query.where(ShipmentReview.created_at >= start_dt)
    if end_dt:
        query = query.where(ShipmentReview.created_at <= end_dt)

    result = await db.execute(
        query.order_by(ShipmentReview.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    shipments = list(result.scalars().all())

    count_query = (
        select(func.count(ShipmentReview.id))
        .where(ShipmentReview.store_id == active_store.id)
    )
    if start_dt:
        count_query = count_query.where(ShipmentReview.created_at >= start_dt)
    if end_dt:
        count_query = count_query.where(ShipmentReview.created_at <= end_dt)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    return PaginatedResponse(
        data=shipments,
        total=total,
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=limit,
    )


@router.get("/stats", response_model=ShipmentStatsResponse)
async def get_shipment_stats(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store),
):
    start_dt, end_dt = parse_date_range(start_date, end_date)

    def _filter_date(query, column):
        if start_dt:
            query = query.where(column >= start_dt)
        if end_dt:
            query = query.where(column <= end_dt)
        return query

    total_q = select(func.count(ShipmentReview.id)).where(ShipmentReview.store_id == active_store.id)
    total_q = _filter_date(total_q, ShipmentReview.created_at)
    total = (await db.execute(total_q)).scalar() or 0

    delivered_q = (
        select(func.count(ShipmentReview.id))
        .where(ShipmentReview.store_id == active_store.id)
        .where(ShipmentReview.delivered_at != None)
    )
    delivered_q = _filter_date(delivered_q, ShipmentReview.created_at)
    delivered = (await db.execute(delivered_q)).scalar() or 0

    sent_q = (
        select(func.count(ShipmentReview.id))
        .where(ShipmentReview.store_id == active_store.id)
        .where(ShipmentReview.review_sent == True)
    )
    sent_q = _filter_date(sent_q, ShipmentReview.created_at)
    sent = (await db.execute(sent_q)).scalar() or 0

    pending_q = (
        select(func.count(ShipmentReview.id))
        .where(ShipmentReview.store_id == active_store.id)
        .where(ShipmentReview.review_sent == False)
    )
    pending_q = _filter_date(pending_q, ShipmentReview.created_at)
    pending = (await db.execute(pending_q)).scalar() or 0

    failed_q = (
        select(func.count(ShipmentMessageLog.id))
        .where(ShipmentMessageLog.store_id == active_store.id)
        .where(ShipmentMessageLog.status == "failed")
    )
    if start_dt:
        failed_q = failed_q.where(ShipmentMessageLog.sent_at >= start_dt)
    if end_dt:
        failed_q = failed_q.where(ShipmentMessageLog.sent_at <= end_dt)
    failed = (await db.execute(failed_q)).scalar() or 0

    return ShipmentStatsResponse(
        total_shipments=total,
        delivered_shipments=delivered,
        review_requests_sent=sent,
        pending_review_shipments=pending,
        failed_review_messages=failed,
    )
