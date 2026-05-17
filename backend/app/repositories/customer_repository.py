from app.repositories.base_repository import BaseRepository
from app.models.customer import Customer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional, List

class CustomerRepository(BaseRepository[Customer]):
    def __init__(self):
        super().__init__(Customer)

    async def get_all(self, db: AsyncSession, skip: int = 0, limit: int = 10) -> List[Customer]:
        result = await db.execute(
            select(self.model)
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def get_by_salla_id(self, db: AsyncSession, salla_customer_id: str, user_id: str) -> Optional[Customer]:
        result = await db.execute(
            select(self.model)
            .where(self.model.salla_customer_id == salla_customer_id)
            .where(self.model.user_id == user_id)
        )
        return result.scalars().first()
