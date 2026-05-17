from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.core.dependencies import get_db
from app.repositories.message_repository import MessageRepository
from app.schemas.message_schema import MessageResponse, MessageStatsResponse
from app.schemas.common import PaginatedResponse
from app.models.message_log import MessageLog

router = APIRouter(prefix="/api/v1/messages", tags=["Messages"])
message_repo = MessageRepository()


@router.get("", response_model=PaginatedResponse[MessageResponse])
async def get_messages(skip: int = 0, limit: int = 10, db: AsyncSession = Depends(get_db)):
    messages = await message_repo.get_all(db, skip=skip, limit=limit)
    total_result = await db.execute(select(func.count(MessageLog.id)))
    total = total_result.scalar() or 0
    return PaginatedResponse(
        data=messages,
        total=total,
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=limit,
    )


@router.get("/stats", response_model=MessageStatsResponse)
async def get_message_stats(db: AsyncSession = Depends(get_db)):
    """Aggregated message counts by status for dashboard charts."""
    total_result = await db.execute(select(func.count(MessageLog.id)))
    total = total_result.scalar() or 0

    sent_result = await db.execute(
        select(func.count(MessageLog.id)).where(MessageLog.status.in_(["accepted", "sent", "delivered", "read"]))
    )
    sent = sent_result.scalar() or 0

    read_result = await db.execute(
        select(func.count(MessageLog.id)).where(MessageLog.status == "read")
    )
    read_count = read_result.scalar() or 0

    failed_result = await db.execute(
        select(func.count(MessageLog.id)).where(MessageLog.status == "failed")
    )
    failed = failed_result.scalar() or 0

    pending_result = await db.execute(
        select(func.count(MessageLog.id)).where(MessageLog.status == "pending")
    )
    pending = pending_result.scalar() or 0

    return MessageStatsResponse(
        total=total,
        sent=sent,
        read=read_count,
        failed=failed,
        pending=pending,
    )
