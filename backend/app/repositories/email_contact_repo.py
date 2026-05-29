from typing import Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import and_
from app.models.email_contact import EmailContact
from app.repositories.base_repository import BaseRepository

class EmailContactRepository(BaseRepository[EmailContact]):
    def __init__(self):
        super().__init__(EmailContact)

    async def get_by_email_and_store(self, db: AsyncSession, store_id: str, email: str) -> Optional[EmailContact]:
        result = await db.execute(
            select(self.model).where(
                and_(self.model.store_id == store_id, self.model.email == email)
            )
        )
        return result.scalars().first()
        
    async def get_pending_sync_contacts(self, db: AsyncSession, limit: int = 100) -> List[EmailContact]:
        result = await db.execute(
            select(self.model).where(self.model.sync_status == "pending").limit(limit)
        )
        return list(result.scalars().all())
