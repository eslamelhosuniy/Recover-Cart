from app.repositories.base_repository import BaseRepository
from app.models.store_settings import StoreSettings
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional

class SettingsRepository(BaseRepository[StoreSettings]):
    def __init__(self):
        super().__init__(StoreSettings)

    async def get_current_settings(self, db: AsyncSession) -> Optional[StoreSettings]:
        result = await db.execute(select(self.model).limit(1))
        return result.scalars().first()
