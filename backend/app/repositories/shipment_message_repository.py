from app.repositories.base_repository import BaseRepository
from app.models.shipment_message_log import ShipmentMessageLog
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Optional


class ShipmentMessageRepository(BaseRepository[ShipmentMessageLog]):
    def __init__(self):
        super().__init__(ShipmentMessageLog)

    async def get_by_whatsapp_id(self, db: AsyncSession, whatsapp_msg_id: str) -> Optional[ShipmentMessageLog]:
        result = await db.execute(
            select(self.model).where(self.model.whatsapp_msg_id == whatsapp_msg_id)
        )
        return result.scalars().first()
