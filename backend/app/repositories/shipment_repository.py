from app.repositories.base_repository import BaseRepository
from app.models.shipment_review import ShipmentReview
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional


class ShipmentRepository(BaseRepository[ShipmentReview]):
    def __init__(self):
        super().__init__(ShipmentReview)

    async def get_by_salla_id(self, db: AsyncSession, salla_shipment_id: str, store_id: str) -> Optional[ShipmentReview]:
        result = await db.execute(
            select(self.model)
            .where(self.model.salla_shipment_id == salla_shipment_id)
            .where(self.model.store_id == store_id)
        )
        return result.scalars().first()
