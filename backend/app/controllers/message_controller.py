from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.repositories.message_repository import MessageRepository
from app.schemas.message_schema import MessageResponse
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/api/v1/messages", tags=["Messages"])
message_repo = MessageRepository()

@router.get("", response_model=PaginatedResponse[MessageResponse])
async def get_messages(skip: int = 0, limit: int = 10, db: AsyncSession = Depends(get_db)):
    messages = await message_repo.get_all(db, skip=skip, limit=limit)
    return PaginatedResponse(
        data=messages,
        total=len(messages),
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=limit
    )
