from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.email_campaign import EmailCampaign
from app.repositories.base_repository import BaseRepository

class EmailCampaignRepository(BaseRepository[EmailCampaign]):
    def __init__(self):
        super().__init__(EmailCampaign)

    async def get_by_store_id(self, db: AsyncSession, store_id: str) -> List[EmailCampaign]:
        result = await db.execute(select(self.model).where(self.model.store_id == store_id))
        return list(result.scalars().all())
