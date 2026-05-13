from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.dependencies import get_db
from app.repositories.message_repository import MessageRepository
from app.schemas.message_schema import MessageResponse
from app.schemas.common import PaginatedResponse
from app.models.message_log import MessageLog

router = APIRouter(prefix="/api/v1/logs", tags=["Logs"])
message_repo = MessageRepository()

@router.get("/errors", response_model=PaginatedResponse[MessageResponse])
async def get_error_logs(skip: int = 0, limit: int = 10, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(MessageLog)
        .where(MessageLog.status == "failed")
        .offset(skip)
        .limit(limit)
    )
    failed_messages = result.scalars().all()
    return PaginatedResponse(
        data=failed_messages,
        total=len(failed_messages),
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=limit
    )
