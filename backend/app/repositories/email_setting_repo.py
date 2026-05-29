from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.email_setting import EmailSetting
from app.repositories.base_repository import BaseRepository

class EmailSettingRepository(BaseRepository[EmailSetting]):
    def __init__(self):
        super().__init__(EmailSetting)

    async def get_by_store_id(self, db: AsyncSession, store_id: str) -> Optional[EmailSetting]:
        result = await db.execute(select(self.model).where(self.model.store_id == store_id))
        return result.scalars().first()
