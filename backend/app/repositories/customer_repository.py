from app.repositories.base_repository import BaseRepository
from app.models.customer import Customer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional

class CustomerRepository(BaseRepository[Customer]):
    def __init__(self):
        super().__init__(Customer)

    async def get_by_salla_id(self, db: AsyncSession, salla_customer_id: str) -> Optional[Customer]:
        result = await db.execute(select(self.model).where(self.model.salla_customer_id == salla_customer_id))
        return result.scalars().first()
