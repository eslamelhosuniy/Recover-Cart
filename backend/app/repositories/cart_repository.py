from app.repositories.base_repository import BaseRepository
from app.models.abandoned_cart import AbandonedCart
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import Optional, List
from datetime import datetime

class CartRepository(BaseRepository[AbandonedCart]):
    def __init__(self):
        super().__init__(AbandonedCart)

    async def get_by_salla_id(self, db: AsyncSession, salla_cart_id: str, store_id: str) -> Optional[AbandonedCart]:
        result = await db.execute(
            select(self.model)
            .where(self.model.salla_cart_id == salla_cart_id)
            .where(self.model.store_id == store_id)
        )
        return result.scalars().first()

    async def get_all(
        self, 
        db: AsyncSession, 
        store_id: any, 
        skip: int = 0, 
        limit: int = 10, 
        status: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[AbandonedCart]:
        query = select(self.model).where(self.model.store_id == store_id)
        
        if status == "recovered":
            query = query.where(self.model.is_recovered == True)
        elif status == "abandoned":
            query = query.where(self.model.is_recovered == False)

        if start_date:
            query = query.where(self.model.abandoned_at >= start_date)
        if end_date:
            query = query.where(self.model.abandoned_at <= end_date)

        result = await db.execute(
            query.options(selectinload(self.model.customer))
            .options(selectinload(self.model.recovered_details))
            .options(selectinload(self.model.messages))
            .order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def get_by_id(self, db: AsyncSession, id: any) -> Optional[AbandonedCart]:
        result = await db.execute(
            select(self.model)
            .where(self.model.id == id)
            .options(selectinload(self.model.customer))
            .options(selectinload(self.model.recovered_details))
            .options(selectinload(self.model.messages))
        )
        return result.scalars().first()

