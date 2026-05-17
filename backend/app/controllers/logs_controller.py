from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.core.dependencies import get_db
from app.core.security import get_current_user
from app.schemas.message_schema import MessageResponse
from app.schemas.common import PaginatedResponse
from app.models.message_log import MessageLog
from app.models.abandoned_cart import AbandonedCart
from app.models.user import User

router = APIRouter(prefix="/api/v1/logs", tags=["Logs"])

MAX_LIMIT = 100


@router.get("/errors", response_model=PaginatedResponse[MessageResponse])
async def get_error_logs(
    skip: int = 0,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    limit = min(limit, MAX_LIMIT)

    result = await db.execute(
        select(MessageLog)
        .join(AbandonedCart, MessageLog.cart_id == AbandonedCart.id)
        .where(AbandonedCart.user_id == current_user.id)
        .where(MessageLog.status == "failed")
        .order_by(MessageLog.sent_at.desc())
        .offset(skip)
        .limit(limit)
    )
    failed_messages = list(result.scalars().all())

    total_result = await db.execute(
        select(func.count(MessageLog.id))
        .join(AbandonedCart, MessageLog.cart_id == AbandonedCart.id)
        .where(AbandonedCart.user_id == current_user.id)
        .where(MessageLog.status == "failed")
    )
    total = total_result.scalar() or 0

    return PaginatedResponse(
        data=failed_messages,
        total=total,
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=limit,
    )
