from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.core.dependencies import get_db
from app.core.security import get_current_user
from app.repositories.message_repository import MessageRepository
from app.schemas.message_schema import MessageResponse, MessageStatsResponse
from app.schemas.common import PaginatedResponse
from app.models.message_log import MessageLog
from app.models.abandoned_cart import AbandonedCart
from app.models.user import User

router = APIRouter(prefix="/api/v1/messages", tags=["Messages"])
message_repo = MessageRepository()

MAX_LIMIT = 100


@router.get("", response_model=PaginatedResponse[MessageResponse])
async def get_messages(
    skip: int = 0,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Clamp limit to prevent abuse
    limit = min(limit, MAX_LIMIT)

    # Only return messages belonging to carts owned by the current user
    result = await db.execute(
        select(MessageLog)
        .join(AbandonedCart, MessageLog.cart_id == AbandonedCart.id)
        .where(AbandonedCart.user_id == current_user.id)
        .order_by(MessageLog.sent_at.desc())
        .offset(skip)
        .limit(limit)
    )
    messages = list(result.scalars().all())

    total_result = await db.execute(
        select(func.count(MessageLog.id))
        .join(AbandonedCart, MessageLog.cart_id == AbandonedCart.id)
        .where(AbandonedCart.user_id == current_user.id)
    )
    total = total_result.scalar() or 0

    return PaginatedResponse(
        data=messages,
        total=total,
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=limit,
    )


@router.get("/stats", response_model=MessageStatsResponse)
async def get_message_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Aggregated message counts by status — scoped to the current user's store."""

    def _count_where(*conditions):
        q = (
            select(func.count(MessageLog.id))
            .join(AbandonedCart, MessageLog.cart_id == AbandonedCart.id)
            .where(AbandonedCart.user_id == current_user.id)
        )
        for c in conditions:
            q = q.where(c)
        return q

    total = (await db.execute(_count_where())).scalar() or 0
    sent = (await db.execute(_count_where(
        MessageLog.status.in_(["accepted", "sent", "delivered", "read"])
    ))).scalar() or 0
    read_count = (await db.execute(_count_where(
        MessageLog.status == "read"
    ))).scalar() or 0
    failed = (await db.execute(_count_where(
        MessageLog.status == "failed"
    ))).scalar() or 0
    pending = (await db.execute(_count_where(
        MessageLog.status == "pending"
    ))).scalar() or 0

    return MessageStatsResponse(
        total=total,
        sent=sent,
        read=read_count,
        failed=failed,
        pending=pending,
    )
