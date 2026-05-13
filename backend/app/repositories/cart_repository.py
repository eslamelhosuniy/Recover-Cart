from app.repositories.base_repository import BaseRepository
from app.models.abandoned_cart import AbandonedCart
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional

class CartRepository(BaseRepository[AbandonedCart]):
    def __init__(self):
        super().__init__(AbandonedCart)

    async def get_by_salla_id(self, db: AsyncSession, salla_cart_id: str) -> Optional[AbandonedCart]:
        result = await db.execute(select(self.model).where(self.model.salla_cart_id == salla_cart_id))
        return result.scalars().first()
