from app.repositories.base_repository import BaseRepository
from app.models.customer import Customer
from app.models.abandoned_cart import AbandonedCart
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Optional, List
from uuid import UUID
from datetime import datetime

class CustomerRepository(BaseRepository[Customer]):
    def __init__(self):
        super().__init__(Customer)

    async def get_all(
        self, 
        db: AsyncSession, 
        user_id: UUID, 
        skip: int = 0, 
        limit: int = 10,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[Customer]:
        query = select(self.model).where(self.model.user_id == user_id)
        if start_date:
            query = query.where(self.model.created_at >= start_date)
        if end_date:
            query = query.where(self.model.created_at <= end_date)

        result = await db.execute(
            query.order_by(self.model.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        customers = list(result.scalars().all())
        
        for customer in customers:
            cart_q = select(func.count(AbandonedCart.id)).where(AbandonedCart.customer_id == customer.id)
            if start_date:
                cart_q = cart_q.where(AbandonedCart.abandoned_at >= start_date)
            if end_date:
                cart_q = cart_q.where(AbandonedCart.abandoned_at <= end_date)
            cart_count_res = await db.execute(cart_q)
            customer.total_carts = cart_count_res.scalar() or 0
            
        return customers

    async def get_by_id(self, db: AsyncSession, id: UUID) -> Optional[Customer]:
        customer = await super().get_by_id(db, id)
        if customer:
            cart_count_res = await db.execute(
                select(func.count(AbandonedCart.id))
                .where(AbandonedCart.customer_id == customer.id)
            )
            customer.total_carts = cart_count_res.scalar() or 0
        return customer

    async def get_by_salla_id(self, db: AsyncSession, salla_customer_id: str, user_id: str) -> Optional[Customer]:
        result = await db.execute(
            select(self.model)
            .where(self.model.salla_customer_id == salla_customer_id)
            .where(self.model.user_id == user_id)
        )
        customer = result.scalars().first()
        if customer:
            cart_count_res = await db.execute(
                select(func.count(AbandonedCart.id))
                .where(AbandonedCart.customer_id == customer.id)
            )
            customer.total_carts = cart_count_res.scalar() or 0
        return customer
