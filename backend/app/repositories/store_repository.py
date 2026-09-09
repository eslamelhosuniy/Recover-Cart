from app.repositories.base_repository import BaseRepository
from app.models.store import Store
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from uuid import UUID

class StoreRepository(BaseRepository[Store]):
    def __init__(self):
        super().__init__(Store)

    async def get_by_owner_id(self, db: AsyncSession, owner_id: UUID) -> List[Store]:
        result = await db.execute(select(self.model).where(self.model.owner_id == owner_id))
        return list(result.scalars().all())

    async def get_count_by_owner_id(self, db: AsyncSession, owner_id: UUID) -> int:
        from sqlalchemy import func
        result = await db.execute(select(func.count(self.model.id)).where(self.model.owner_id == owner_id))
        return result.scalar() or 0

    async def get_by_salla_store_id(self, db: AsyncSession, salla_store_id: str) -> Optional[Store]:
        result = await db.execute(select(self.model).where(self.model.salla_store_id == salla_store_id))
        return result.scalars().first()

    async def delete_store_cascade(self, db: AsyncSession, store_id: UUID) -> bool:
        from app.models.customer_review import CustomerReview
        from app.models.message_log import MessageLog
        from app.models.recovered_cart import RecoveredCart
        from app.models.abandoned_cart import AbandonedCart
        from app.models.customer import Customer
        from app.models.appointment import Appointment
        from app.models.email_tracking import EmailTrackingLog
        from app.models.email_campaign_contact import EmailCampaignContact
        from app.models.email_campaign import EmailCampaign
        from app.models.email_contact import EmailContact
        from app.models.email_setting import EmailSetting
        from app.models.sendgrid_data import SendgridList, SendgridSender, SendgridSuppressionGroup
        from sqlalchemy import delete, update

        store = await self.get_by_id(db, store_id)
        if not store:
            return False

        # 1. Customer reviews (references store_id, customer_id, recovered_cart_id)
        await db.execute(delete(CustomerReview).where(CustomerReview.store_id == store_id))
        
        # 2. Message logs (references store_id, cart_id, appointment_id)
        await db.execute(delete(MessageLog).where(MessageLog.store_id == store_id))
        
        # 3. Recovered carts (references store_id, cart_id)
        await db.execute(delete(RecoveredCart).where(RecoveredCart.store_id == store_id))
        
        # 4. Abandoned carts (references store_id, customer_id)
        await db.execute(delete(AbandonedCart).where(AbandonedCart.store_id == store_id))
        
        # 5. Customers (references store_id)
        await db.execute(delete(Customer).where(Customer.store_id == store_id))
        
        # 6. Appointments (references store_id)
        await db.execute(delete(Appointment).where(Appointment.store_id == store_id))
        
        # 7. Email tracking logs (references store_id, campaign_id, contact_id)
        await db.execute(delete(EmailTrackingLog).where(EmailTrackingLog.store_id == store_id))
        
        # 8. Email campaign contacts
        campaign_ids_subq = select(EmailCampaign.id).where(EmailCampaign.store_id == store_id)
        await db.execute(delete(EmailCampaignContact).where(EmailCampaignContact.campaign_id.in_(campaign_ids_subq)))
        
        contact_ids_subq = select(EmailContact.id).where(EmailContact.store_id == store_id)
        await db.execute(delete(EmailCampaignContact).where(EmailCampaignContact.contact_id.in_(contact_ids_subq)))
        
        # 9. Email campaigns (break self-referencing hierarchy first)
        await db.execute(update(EmailCampaign).where(EmailCampaign.store_id == store_id).values(parent_id=None))
        await db.execute(delete(EmailCampaign).where(EmailCampaign.store_id == store_id))
        
        # 10. Email contacts
        await db.execute(delete(EmailContact).where(EmailContact.store_id == store_id))
        
        # 11. Email settings
        await db.execute(delete(EmailSetting).where(EmailSetting.store_id == store_id))
        
        # 12. Sendgrid lists, senders, suppression groups
        await db.execute(delete(SendgridList).where(SendgridList.store_id == store_id))
        await db.execute(delete(SendgridSender).where(SendgridSender.store_id == store_id))
        await db.execute(delete(SendgridSuppressionGroup).where(SendgridSuppressionGroup.store_id == store_id))
        
        # 13. Finally delete the store
        await db.execute(delete(Store).where(Store.id == store_id))
        
        await db.commit()
        return True

