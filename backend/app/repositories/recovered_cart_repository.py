from typing import Optional
from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.repositories.base_repository import BaseRepository
from app.models.recovered_cart import RecoveredCart
from app.models.abandoned_cart import AbandonedCart


class RecoveredCartRepository(BaseRepository[RecoveredCart]):
    def __init__(self):
        super().__init__(RecoveredCart)

    async def get_latest_by_customer(
        self,
        db: AsyncSession,
        customer_id: UUID,
        store_id: UUID,
    ) -> Optional[RecoveredCart]:
        query = (
            select(self.model)
            .join(AbandonedCart, self.model.cart_id == AbandonedCart.id)
            .where(AbandonedCart.customer_id == customer_id)
            .where(self.model.store_id == store_id)
            .order_by(self.model.created_at.desc())
            .limit(1)
        )

        result = await db.execute(query)
        return result.scalars().first()
