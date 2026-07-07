from sqlalchemy.ext.asyncio import AsyncSession
import logging
from app.repositories.email_setting_repo import EmailSettingRepository
from app.repositories.email_contact_repo import EmailContactRepository
from app.repositories.email_campaign_repo import EmailCampaignRepository, EmailCampaignRunLogRepository
from app.services.sendgrid_client import SendGridClient

logger = logging.getLogger(__name__)

class EmailMarketingService:
    def __init__(self):
        self.setting_repo = EmailSettingRepository()
        self.contact_repo = EmailContactRepository()
        self.campaign_repo = EmailCampaignRepository()
        self.run_log_repo = EmailCampaignRunLogRepository()

    async def get_senders(self, db: AsyncSession, store_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
        from app.models.sendgrid_data import SendgridSender
        from sqlalchemy.future import select
        result = await db.execute(select(SendgridSender).where(SendgridSender.store_id == store_id))
        return [{"id": s.sg_sender_id, "nickname": s.nickname, "from": {"email": s.from_email, "name": s.from_name}} for s in result.scalars().all()]

    async def get_lists(self, db: AsyncSession, store_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
        from app.models.sendgrid_data import SendgridList
        from sqlalchemy.future import select
        result = await db.execute(select(SendgridList).where(SendgridList.store_id == store_id))
        return [{"id": s.sg_list_id, "name": s.name, "contact_count": s.contact_count} for s in result.scalars().all()]

    async def get_suppression_groups(self, db: AsyncSession, store_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
        from app.models.sendgrid_data import SendgridSuppressionGroup
        from sqlalchemy.future import select
        result = await db.execute(select(SendgridSuppressionGroup).where(SendgridSuppressionGroup.store_id == store_id))
        return [{"id": s.sg_group_id, "name": s.name, "description": s.description, "is_default": s.is_default} for s in result.scalars().all()]

    async def create_list(self, db: AsyncSession, store_id: str, name: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
        res = await SendGridClient(settings.sendgrid_api_key).create_list(name)
        
        # Save to local DB
        from app.models.sendgrid_data import SendgridList
        new_list = SendgridList(store_id=store_id, sg_list_id=str(res.get("id")), name=res.get("name", ""), contact_count=0)
        db.add(new_list)
        await db.commit()
        return res

    async def get_designs(self, db: AsyncSession, store_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
        return await SendGridClient(settings.sendgrid_api_key).get_designs()

    async def get_design(self, db: AsyncSession, store_id: str, design_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
        return await SendGridClient(settings.sendgrid_api_key).get_design(design_id)

    async def delete_list(self, db: AsyncSession, store_id: str, list_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
        
        # Delete from SendGrid
        await SendGridClient(settings.sendgrid_api_key).delete_list(list_id)
        
        # Delete from local DB
        from app.models.sendgrid_data import SendgridList
        from sqlalchemy.future import select
        res = await db.execute(select(SendgridList).where(SendgridList.store_id == store_id, SendgridList.sg_list_id == list_id))
        local_list = res.scalar_one_or_none()
        if local_list:
            await db.delete(local_list)
            await db.commit()
            
    async def delete_design(self, db: AsyncSession, store_id: str, design_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
        await SendGridClient(settings.sendgrid_api_key).delete_design(design_id)

    async def delete_suppression_group(self, db: AsyncSession, store_id: str, group_id: int):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
            
        await SendGridClient(settings.sendgrid_api_key).delete_suppression_group(group_id)
        
        from app.models.sendgrid_data import SendgridSuppressionGroup
        from sqlalchemy.future import select
        res = await db.execute(select(SendgridSuppressionGroup).where(SendgridSuppressionGroup.store_id == store_id, SendgridSuppressionGroup.sg_group_id == group_id))
        local_sg = res.scalar_one_or_none()
        if local_sg:
            await db.delete(local_sg)
            await db.commit()
            
    async def get_contacts_by_list(self, db: AsyncSession, store_id: str, list_id: str, skip: int = 0, limit: int = 20):
        from app.models.email_contact import EmailContact
        from sqlalchemy.future import select
        from sqlalchemy import func
        
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        default_list_id = settings.sendgrid_default_list_id if settings else None
        
        if list_id == default_list_id:
            query = select(EmailContact).where(
                EmailContact.store_id == store_id,
                (EmailContact.sendgrid_list_id == list_id) | (EmailContact.sendgrid_list_id == None)
            )
            count_query = select(func.count(EmailContact.id)).where(
                EmailContact.store_id == store_id,
                (EmailContact.sendgrid_list_id == list_id) | (EmailContact.sendgrid_list_id == None)
            )
        else:
            query = select(EmailContact).where(
                EmailContact.store_id == store_id,
                EmailContact.sendgrid_list_id == list_id
            )
            count_query = select(func.count(EmailContact.id)).where(
                EmailContact.store_id == store_id,
                EmailContact.sendgrid_list_id == list_id
            )
            
        total = await db.scalar(count_query)
        query = query.order_by(EmailContact.created_at.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        contacts = result.scalars().all()
        return {"total": total, "items": contacts}

    async def delete_contact(self, db: AsyncSession, store_id: str, contact_id: str):
        from app.models.email_contact import EmailContact
        contact = await db.get(EmailContact, contact_id)
        if not contact or str(contact.store_id) != str(store_id):
            raise ValueError("Contact not found")
            
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if settings and settings.sendgrid_api_key:
            try:
                await SendGridClient(settings.sendgrid_api_key).delete_contact_by_email(contact.email)
            except Exception as e:
                logger.error(f"Failed to delete contact from SendGrid: {e}")
                
        await db.delete(contact)
        await db.commit()

    async def create_suppression_group(self, db: AsyncSession, store_id: str, name: str, description: str, is_default: bool = False):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
        res = await SendGridClient(settings.sendgrid_api_key).create_suppression_group(name, description, is_default)
        
        # Save to local DB
        from app.models.sendgrid_data import SendgridSuppressionGroup
        new_sg = SendgridSuppressionGroup(store_id=store_id, sg_group_id=int(res.get("id")), name=res.get("name", ""), description=res.get("description", ""), is_default=res.get("is_default", False))
        db.add(new_sg)
        await db.commit()
        return res


    async def sync_pending_contacts(self, db: AsyncSession, store_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            logger.warning(f"Store {store_id} missing SendGrid API key for contact sync.")
            return

        pending = await self.contact_repo.get_pending_sync_contacts(db)
        store_pending = [c for c in pending if str(c.store_id) == str(store_id)]
        
        if not store_pending:
            return

        client = SendGridClient(settings.sendgrid_api_key)
        
        # Group contacts by list_id
        from collections import defaultdict
        grouped_contacts = defaultdict(list)
        
        for contact in store_pending:
            target_list_id = contact.sendgrid_list_id
            if not target_list_id and settings.sendgrid_default_list_id:
                target_list_id = settings.sendgrid_default_list_id
            
            # Use 'no_list' as a placeholder key if target_list_id is still None
            grouped_contacts[target_list_id or 'no_list'].append(contact)

        for list_id, group in grouped_contacts.items():
            sg_contacts = []
            for contact in group:
                data = {"email": contact.email}
                if contact.first_name: data["first_name"] = contact.first_name
                if contact.last_name: data["last_name"] = contact.last_name
                sg_contacts.append(data)

            try:
                await client.add_or_update_contacts(list_id, sg_contacts)
                for contact in group:
                    await self.contact_repo.update(db, contact, {"sync_status": "synced"})
                logger.info(f"Successfully sent {len(group)} contacts to SendGrid list {list_id} for store {store_id}")
            except Exception as e:
                logger.error(f"Failed to sync contacts to SendGrid list {list_id}: {str(e)}")
                for contact in group:
                    await self.contact_repo.update(db, contact, {"sync_status": "failed"})

    async def create_campaign(self, db: AsyncSession, store_id: str, name: str, subject: str, list_id: str, sender_id: int, suppression_group_id: int = None, custom_unsubscribe_url: str = None, html_content: str = "", **kwargs):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")

        client = SendGridClient(settings.sendgrid_api_key)
        
        response = await client.create_single_send(
            name=name,
            subject=subject,
            list_id=list_id,
            sender_id=sender_id,
            suppression_group_id=suppression_group_id,
            custom_unsubscribe_url=custom_unsubscribe_url,
            html_content=html_content
        )
        
        sg_campaign_id = response.get("id")
        
        campaign_data = {
            "store_id": store_id,
            "sendgrid_campaign_id": sg_campaign_id,
            "name": name,
            "subject": subject,
            "status": "draft",
            "is_warmup": kwargs.get("is_warmup", False)
        }
        campaign = await self.campaign_repo.create(db, campaign_data)
        
        # Link current contacts in this list to the campaign
        from sqlalchemy.future import select
        from app.models.email_contact import EmailContact
        from app.models.email_campaign_contact import EmailCampaignContact
        
        # Find all contacts in this store that belong to the list_id
        # (or default list if list_id matches settings.sendgrid_default_list_id)
        default_list_id = settings.sendgrid_default_list_id
        if list_id == default_list_id:
            query = select(EmailContact).where(
                EmailContact.store_id == store_id,
                (EmailContact.sendgrid_list_id == list_id) | (EmailContact.sendgrid_list_id == None)
            )
        else:
            query = select(EmailContact).where(
                EmailContact.store_id == store_id,
                EmailContact.sendgrid_list_id == list_id
            )
            
        result = await db.execute(query)
        contacts_in_list = result.scalars().all()
        
        for contact in contacts_in_list:
            mapping = EmailCampaignContact(
                campaign_id=campaign.id,
                contact_id=contact.id
            )
            db.add(mapping)
            
        await db.commit()
        return campaign

    async def update_campaign(self, db: AsyncSession, store_id: str, campaign_id: str, update_data: dict):
        campaign = await self.campaign_repo.get_by_id(db, campaign_id)
        if not campaign or str(campaign.store_id) != str(store_id):
            raise ValueError("Campaign not found or does not belong to this store.")
            
        if campaign.sendgrid_campaign_id and campaign.status == "draft":
            settings = await self.setting_repo.get_by_store_id(db, store_id)
            if settings and settings.sendgrid_api_key:
                client = SendGridClient(settings.sendgrid_api_key)
                try:
                    await client.update_single_send(
                        campaign_id=campaign.sendgrid_campaign_id,
                        name=update_data.get("name"),
                        subject=update_data.get("subject"),
                        list_id=update_data.get("list_id"),
                        sender_id=update_data.get("sender_id"),
                        suppression_group_id=update_data.get("suppression_group_id"),
                        custom_unsubscribe_url=update_data.get("custom_unsubscribe_url"),
                        html_content=update_data.get("html_content")
                    )
                except Exception as e:
                    logger.error(f"Failed to update SendGrid single send {campaign.sendgrid_campaign_id}: {e}")
        
        return await self.campaign_repo.update(db, campaign, update_data)

    async def sync_campaigns_status(self, db: AsyncSession, store_id: str):
        from sqlalchemy.future import select
        from app.models.email_campaign import EmailCampaign
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            return
            
        # Get all scheduled campaigns
        res = await db.execute(select(EmailCampaign).where(EmailCampaign.store_id == store_id, EmailCampaign.status == "scheduled"))
        campaigns = res.scalars().all()
        if not campaigns:
            return
            
        client = SendGridClient(settings.sendgrid_api_key)
        for c in campaigns:
            if c.sendgrid_campaign_id:
                try:
                    sg_camp = await client.get_single_send(c.sendgrid_campaign_id)
                    sg_status = sg_camp.get("status")
                    if sg_status and sg_status.lower() in ["triggered", "done"]:
                        await self.campaign_repo.update(db, c, {"status": "sent"})
                except Exception as e:
                    logger.error(f"Failed to check status for {c.sendgrid_campaign_id}: {e}")
                    
        # Check warmup campaigns
        res = await db.execute(select(EmailCampaign).where(EmailCampaign.store_id == store_id, EmailCampaign.status == "warming_up"))
        warmups = res.scalars().all()
        for w in warmups:
            # Check if all child campaigns are sent
            child_res = await db.execute(select(EmailCampaign).where(EmailCampaign.parent_id == w.id))
            children = child_res.scalars().all()
            all_sent = True
            for child in children:
                if child.status == "scheduled":
                    if child.sendgrid_campaign_id:
                        try:
                            sg_camp = await client.get_single_send(child.sendgrid_campaign_id)
                            sg_status = sg_camp.get("status")
                            if sg_status and sg_status.lower() in ["triggered", "done"]:
                                await self.campaign_repo.update(db, child, {"status": "sent"})
                            else:
                                all_sent = False
                        except Exception as e:
                            all_sent = False
                    else:
                        all_sent = False
                elif child.status != "sent":
                    all_sent = False
                    
            if all_sent and children:
                await self.campaign_repo.update(db, w, {"status": "sent"})

    async def run_live_campaign(self, db: AsyncSession, store_id: str, campaign_id: str):
        campaign = await self.campaign_repo.get_by_id(db, campaign_id)
        if not campaign or str(campaign.store_id) != str(store_id):
            raise ValueError("Campaign not found or does not belong to this store.")

        if campaign.is_warmup or campaign.status == "warming_up" or campaign.parent_id is not None:
            raise ValueError("Cannot run this campaign live while it is in warm-up freeze.")

        if campaign.status not in {"draft", "scheduled"}:
            raise ValueError(f"This campaign cannot be scheduled again because its current status is '{campaign.status}'. Only draft or scheduled campaigns can be run.")

        result = await self.schedule_campaign(db, store_id, campaign_id)
        await self._log_campaign_run(db, store_id, campaign_id, "manual_run", "completed", "Campaign started live", {"scheduled_at": getattr(campaign, "scheduled_at", None).isoformat() if getattr(campaign, "scheduled_at", None) else None})
        return result

    async def _log_campaign_run(self, db: AsyncSession, store_id: str, campaign_id: str, event_type: str, status: str, message: str, details: dict | None = None):
        import json
        await self.run_log_repo.create(db, {
            "store_id": store_id,
            "campaign_id": campaign_id,
            "event_type": event_type,
            "status": status,
            "message": message,
            "details": json.dumps(details) if details is not None else None,
        })

    async def get_campaign_run_logs(self, db: AsyncSession, store_id: str, campaign_id: str):
        campaign = await self.campaign_repo.get_by_id(db, campaign_id)
        if not campaign or str(campaign.store_id) != str(store_id):
            raise ValueError("Campaign not found or does not belong to this store.")
        return await self.run_log_repo.get_by_campaign_id(db, campaign_id)

    async def schedule_campaign(self, db: AsyncSession, store_id: str, campaign_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")

        campaign = await self.campaign_repo.get_by_id(db, campaign_id)
        if not campaign or str(campaign.store_id) != str(store_id):
            raise ValueError("Campaign not found or does not belong to this store.")

        client = SendGridClient(settings.sendgrid_api_key)

        if campaign.status not in {"draft", "scheduled"}:
            raise ValueError(f"This campaign cannot be scheduled because its current status is '{campaign.status}'. Only draft or scheduled campaigns can be run.")

        if campaign.is_warmup:
            sg_camp = await client.get_single_send(campaign.sendgrid_campaign_id)
            email_config = sg_camp.get("email_config", {})
            send_to = sg_camp.get("send_to", {})
            list_ids = send_to.get("list_ids", [])
            if not list_ids:
                raise ValueError("Cannot warmup campaign without a target list.")
            
            target_list_id = list_ids[0]
            
            from app.models.email_contact import EmailContact
            from sqlalchemy.future import select
            
            default_list_id = settings.sendgrid_default_list_id
            if target_list_id == default_list_id:
                query = select(EmailContact).where(
                    EmailContact.store_id == store_id,
                    (EmailContact.sendgrid_list_id == target_list_id) | (EmailContact.sendgrid_list_id == None)
                )
            else:
                query = select(EmailContact).where(
                    EmailContact.store_id == store_id,
                    EmailContact.sendgrid_list_id == target_list_id
                )
                
            result = await db.execute(query)
            contacts = result.scalars().all()
            
            if not contacts:
                raise ValueError("No contacts found for this list.")
                
            WARMUP_SCHEDULE = [45, 90, 180, 360, 720, 1440, 2880, 5760, 11520, 23040, 46080, 50000]
            chunks = []
            remaining = list(contacts)
            day_idx = 0
            while remaining:
                limit = WARMUP_SCHEDULE[day_idx] if day_idx < len(WARMUP_SCHEDULE) else WARMUP_SCHEDULE[-1]
                chunks.append(remaining[:limit])
                remaining = remaining[limit:]
                day_idx += 1
                
            import datetime
            first_scheduled_at = None
            for idx, chunk in enumerate(chunks):
                day = idx + 1
                new_list_name = f"{campaign.name} - Warmup Day {day}"
                new_list = await client.create_list(new_list_name)
                new_list_id = new_list.get("id")

                sg_contacts = [{"email": c.email, "first_name": c.first_name, "last_name": c.last_name} for c in chunk]
                await client.add_or_update_contacts(new_list_id, sg_contacts)

                sub_camp = await client.create_single_send(
                    name=f"{campaign.name} - Day {day}",
                    subject=email_config.get("subject"),
                    list_id=new_list_id,
                    sender_id=email_config.get("sender_id"),
                    suppression_group_id=email_config.get("suppression_group_id"),
                    custom_unsubscribe_url=email_config.get("custom_unsubscribe_url"),
                    html_content=email_config.get("html_content", "")
                )

                send_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=idx)
                if idx == 0:
                    first_scheduled_at = send_time
                send_time_str = send_time.strftime("%Y-%m-%dT%H:%M:%SZ") if idx > 0 else "now"
                await client.schedule_single_send(sub_camp.get("id"), send_time_str)

                child_data = {
                    "store_id": store_id,
                    "sendgrid_campaign_id": sub_camp.get("id"),
                    "name": f"{campaign.name} - Day {day}",
                    "subject": email_config.get("subject"),
                    "status": "scheduled",
                    "parent_id": campaign.id,
                    "warmup_day": day,
                    "scheduled_at": send_time
                }
                await self.campaign_repo.create(db, child_data)

            updated_campaign = await self.campaign_repo.update(db, campaign, {"status": "scheduled", "scheduled_at": first_scheduled_at})
            await self._log_campaign_run(db, store_id, campaign_id, "scheduled", "completed", "Warmup campaign scheduled", {"status": updated_campaign.status, "scheduled_at": updated_campaign.scheduled_at.isoformat() if updated_campaign.scheduled_at else None})
            return updated_campaign
        else:
            await client.schedule_single_send(campaign.sendgrid_campaign_id)
            import datetime
            updated_campaign = await self.campaign_repo.update(db, campaign, {
                "status": "scheduled",
                "scheduled_at": datetime.datetime.now(datetime.timezone.utc)
            })
            await self._log_campaign_run(db, store_id, campaign_id, "scheduled", "completed", "Campaign scheduled for sending", {"status": updated_campaign.status, "scheduled_at": updated_campaign.scheduled_at.isoformat() if updated_campaign.scheduled_at else None})
            return updated_campaign

    async def get_campaign_stats(self, db: AsyncSession, store_id: str, campaign_ids: list[str] = None):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
            
        client = SendGridClient(settings.sendgrid_api_key)
        return await client.get_single_sends_stats(campaign_ids)

    async def send_transactional_email(self, db: AsyncSession, store_id: str, to_email: str, subject: str, html_content: str, from_name: str = None):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key or not settings.from_email:
            raise ValueError("Store missing SendGrid API key or 'from_email' setting.")

        client = SendGridClient(settings.sendgrid_api_key)
        
        response = await client.send_transactional_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            from_email=settings.from_email,
            from_name=from_name or settings.from_name
        )

        from app.repositories.email_tracking_repo import EmailTrackingRepository
        tracking_repo = EmailTrackingRepository()
        log_data = {
            "store_id": store_id,
            "sendgrid_msg_id": response.get("message_id", "unknown"),
            "event_type": "transactional_sent"
        }
        await tracking_repo.create(db, log_data)
        
        return response


    async def sync_sendgrid_data(self, db: AsyncSession, store_id: str):
        from app.models.sendgrid_data import SendgridList, SendgridSender, SendgridSuppressionGroup
        from sqlalchemy.future import select
        
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings or not settings.sendgrid_api_key:
            raise ValueError("Store missing SendGrid API key.")
            
        client = SendGridClient(settings.sendgrid_api_key)
        import asyncio
        lists_data, senders_data, supp_data = await asyncio.gather(
            client.get_lists(),
            client.get_senders(),
            client.get_suppression_groups(),
            return_exceptions=True
        )
        
        if isinstance(lists_data, Exception): lists_data = []
        if isinstance(senders_data, Exception): senders_data = []
        if isinstance(supp_data, Exception): supp_data = []

        # Upsert Lists
        for l in lists_data:
            list_id_str = str(l.get("id"))
            existing = await db.scalar(select(SendgridList).where(SendgridList.sg_list_id == list_id_str))
            if existing:
                existing.name = l.get("name", "")
                existing.contact_count = l.get("contact_count", 0)
            else:
                new_list = SendgridList(store_id=store_id, sg_list_id=list_id_str, name=l.get("name", ""), contact_count=l.get("contact_count", 0))
                db.add(new_list)

        # Upsert Senders
        for s in senders_data:
            sender_id = int(s.get("id"))
            existing = await db.scalar(select(SendgridSender).where(SendgridSender.sg_sender_id == sender_id))
            if existing:
                existing.nickname = s.get("nickname")
                existing.from_email = s.get("from", {}).get("email", "")
                existing.from_name = s.get("from", {}).get("name")
            else:
                new_sender = SendgridSender(store_id=store_id, sg_sender_id=sender_id, nickname=s.get("nickname"), from_email=s.get("from", {}).get("email", ""), from_name=s.get("from", {}).get("name"))
                db.add(new_sender)

        # Upsert Suppression Groups
        for sg in supp_data:
            sg_id = int(sg.get("id"))
            existing = await db.scalar(select(SendgridSuppressionGroup).where(SendgridSuppressionGroup.sg_group_id == sg_id))
            if existing:
                existing.name = sg.get("name", "")
                existing.description = sg.get("description", "")
                existing.is_default = sg.get("is_default", False)
            else:
                new_sg = SendgridSuppressionGroup(store_id=store_id, sg_group_id=sg_id, name=sg.get("name", ""), description=sg.get("description", ""), is_default=sg.get("is_default", False))
                db.add(new_sg)

        await db.commit()
        
        # Trigger background heavy sync for contacts and campaigns
        from app.jobs.sync_sendgrid_job import trigger_heavy_sync_for_store
        asyncio.create_task(trigger_heavy_sync_for_store(store_id))
        
        return {"message": "Basic sync completed, heavy data sync started in background"}
