from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.core.dependencies import get_db, get_active_store
from app.models.store import Store
from app.schemas.message_schema import MessageResponse
from app.schemas.common import PaginatedResponse
from app.models.message_log import MessageLog

router = APIRouter(prefix="/api/v1/logs", tags=["Logs"])

MAX_LIMIT = 100


@router.get("/errors", response_model=PaginatedResponse[MessageResponse])
async def get_error_logs(
    skip: int = 0,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store),
):
    limit = min(limit, MAX_LIMIT)

    result = await db.execute(
        select(MessageLog)
        .where(MessageLog.store_id == active_store.id)
        .where(MessageLog.status == "failed")
        .order_by(MessageLog.sent_at.desc())
        .offset(skip)
        .limit(limit)
    )
    failed_messages = list(result.scalars().all())

    total_result = await db.execute(
        select(func.count(MessageLog.id))
        .where(MessageLog.store_id == active_store.id)
        .where(MessageLog.status == "failed")
    )
    total = total_result.scalar() or 0

    return PaginatedResponse(
        data=failed_messages,
        total=total,
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=limit,
    )

