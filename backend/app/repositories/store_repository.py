from app.repositories.base_repository import BaseRepository
from app.models.store import Store
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from uuid import UUID

class StoreRepository(BaseRepository[Store]):
    def __init__(self):
        super().__init__(Store)

    async def get_by_owner_id(self, db: AsyncSession, owner_id: UUID) -> List[Store]:
        result = await db.execute(select(self.model).where(self.model.owner_id == owner_id))
        return list(result.scalars().all())

    async def get_count_by_owner_id(self, db: AsyncSession, owner_id: UUID) -> int:
        from sqlalchemy import func
        result = await db.execute(select(func.count(self.model.id)).where(self.model.owner_id == owner_id))
        return result.scalar() or 0

    async def get_by_salla_store_id(self, db: AsyncSession, salla_store_id: str) -> Optional[Store]:
        result = await db.execute(select(self.model).where(self.model.salla_store_id == salla_store_id))
        return result.scalars().first()
