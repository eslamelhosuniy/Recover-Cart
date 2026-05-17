from app.repositories.base_repository import BaseRepository
from app.models.abandoned_cart import AbandonedCart
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Optional, List

class CartRepository(BaseRepository[AbandonedCart]):
    def __init__(self):
        super().__init__(AbandonedCart)

    async def get_by_salla_id(self, db: AsyncSession, salla_cart_id: str, user_id: str) -> Optional[AbandonedCart]:
        result = await db.execute(
            select(self.model)
            .where(self.model.salla_cart_id == salla_cart_id)
            .where(self.model.user_id == user_id)
        )
        return result.scalars().first()

    async def get_all(self, db: AsyncSession, skip: int = 0, limit: int = 10) -> List[AbandonedCart]:
        result = await db.execute(
            select(self.model)
            .options(selectinload(self.model.customer))
            .offset(skip)
            .limit(limit)
            .order_by(self.model.created_at.desc())
        )
        return result.scalars().all()

    async def get_by_id(self, db: AsyncSession, id: any) -> Optional[AbandonedCart]:
        result = await db.execute(
            select(self.model)
            .where(self.model.id == id)
            .options(selectinload(self.model.customer))
        )
        return result.scalars().first()
