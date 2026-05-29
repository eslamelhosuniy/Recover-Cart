from app.repositories.base_repository import BaseRepository
from app.models.message_log import MessageLog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

class MessageRepository(BaseRepository[MessageLog]):
    def __init__(self):
        super().__init__(MessageLog)

    async def get_all(self, db: AsyncSession, store_id: any, skip: int = 0, limit: int = 10) -> List[MessageLog]:
        result = await db.execute(
            select(self.model)
            .where(self.model.store_id == store_id)
            .order_by(self.model.sent_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

