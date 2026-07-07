from typing import List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.models.email_campaign import EmailCampaign
from app.repositories.base_repository import BaseRepository


class EmailCampaignRunLogRepository(BaseRepository):
    def __init__(self):
        from app.models.email_campaign_run_log import EmailCampaignRunLog
        super().__init__(EmailCampaignRunLog)

    async def get_by_campaign_id(self, db: AsyncSession, campaign_id: str) -> List:
        result = await db.execute(select(self.model).where(self.model.campaign_id == campaign_id).order_by(self.model.triggered_at.desc()))
        return list(result.scalars().all())

class EmailCampaignRepository(BaseRepository[EmailCampaign]):
    def __init__(self):
        super().__init__(EmailCampaign)

    async def get_by_store_id(self, db: AsyncSession, store_id: str) -> List[EmailCampaign]:
        result = await db.execute(select(self.model).where(self.model.store_id == store_id))
        return list(result.scalars().all())
