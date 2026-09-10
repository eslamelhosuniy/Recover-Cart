from sqlalchemy.ext.asyncio import AsyncSession
import logging
import datetime
from typing import Optional, List, Dict, Any
from app.repositories.email_setting_repo import EmailSettingRepository
from app.repositories.email_contact_repo import EmailContactRepository
from app.repositories.email_campaign_repo import EmailCampaignRepository, EmailCampaignRunLogRepository
from app.services.email_providers.factory import EmailProviderFactory
from app.services.email_providers.mailgun_client import MailgunClient
from app.services.email_providers.sendgrid_client import SendGridClient

logger = logging.getLogger(__name__)


class EmailMarketingService:
    def __init__(self):
        self.setting_repo = EmailSettingRepository()
        self.contact_repo = EmailContactRepository()
        self.campaign_repo = EmailCampaignRepository()
        self.run_log_repo = EmailCampaignRunLogRepository()

    async def _get_provider_for_store(self, db: AsyncSession, store_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings:
            raise ValueError("Email settings not configured for this store.")
        return EmailProviderFactory.get_provider(settings), settings

    async def get_senders(self, db: AsyncSession, store_id: str):
        provider, settings = await self._get_provider_for_store(db, store_id)
        if isinstance(provider, SendGridClient):
            from app.models.sendgrid_data import SendgridSender
            from sqlalchemy.future import select
            result = await db.execute(select(SendgridSender).where(SendgridSender.store_id == store_id))
            senders = result.scalars().all()
            if senders:
                return [{"id": s.sg_sender_id, "nickname": s.nickname, "from": {"email": s.from_email, "name": s.from_name}} for s in senders]
        
        return await provider.get_senders()

    async def get_lists(self, db: AsyncSession, store_id: str):
        provider, settings = await self._get_provider_for_store(db, store_id)
        from app.models.sendgrid_data import SendgridList
        from sqlalchemy.future import select
        result = await db.execute(select(SendgridList).where(SendgridList.store_id == store_id))
        local_lists = result.scalars().all()
        if local_lists:
            return [{"id": s.sg_list_id, "name": s.name, "contact_count": s.contact_count} for s in local_lists]
        
        # Fallback to direct provider query
        return await provider.get_lists()

    async def get_suppression_groups(self, db: AsyncSession, store_id: str):
        provider, settings = await self._get_provider_for_store(db, store_id)
        if isinstance(provider, SendGridClient):
            from app.models.sendgrid_data import SendgridSuppressionGroup
            from sqlalchemy.future import select
            result = await db.execute(select(SendgridSuppressionGroup).where(SendgridSuppressionGroup.store_id == store_id))
            local_groups = result.scalars().all()
            if local_groups:
                return [{"id": s.sg_group_id, "name": s.name, "description": s.description, "is_default": s.is_default} for s in local_groups]
        
        return await provider.get_suppression_groups()

    async def create_list(self, db: AsyncSession, store_id: str, name: str, description: Optional[str] = None):
        provider, settings = await self._get_provider_for_store(db, store_id)
        res = await provider.create_list(name, description)
        
        # Save to local DB
        from app.models.sendgrid_data import SendgridList
        list_id = str(res.get("id") or res.get("address"))
        new_list = SendgridList(store_id=store_id, sg_list_id=list_id, name=res.get("name", name), contact_count=0)
        db.add(new_list)
        await db.commit()
        return res

    async def get_designs(self, db: AsyncSession, store_id: str):
        provider, settings = await self._get_provider_for_store(db, store_id)
        return await provider.get_designs()

    async def get_design(self, db: AsyncSession, store_id: str, design_id: str):
        provider, settings = await self._get_provider_for_store(db, store_id)
        return await provider.get_design(design_id)

    async def delete_list(self, db: AsyncSession, store_id: str, list_id: str):
        provider, settings = await self._get_provider_for_store(db, store_id)
        await provider.delete_list(list_id)
        
        # Delete from local DB
        from app.models.sendgrid_data import SendgridList
        from sqlalchemy.future import select
        res = await db.execute(select(SendgridList).where(SendgridList.store_id == store_id, SendgridList.sg_list_id == list_id))
        local_list = res.scalar_one_or_none()
        if local_list:
            await db.delete(local_list)
            await db.commit()

    async def delete_design(self, db: AsyncSession, store_id: str, design_id: str):
        provider, settings = await self._get_provider_for_store(db, store_id)
        await provider.delete_design(design_id)

    async def delete_suppression_group(self, db: AsyncSession, store_id: str, group_id: int):
        provider, settings = await self._get_provider_for_store(db, store_id)
        if isinstance(provider, SendGridClient):
            await provider.delete_suppression_group(group_id)
            
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
        default_list_id = settings.sendgrid_default_list_id or settings.mailgun_default_list_address if settings else None
        
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
            
        try:
            provider, settings = await self._get_provider_for_store(db, store_id)
            await provider.delete_contact(contact.email, contact.sendgrid_list_id)
        except Exception as e:
            logger.error(f"Failed to delete contact from provider: {e}")
                
        await db.delete(contact)
        await db.commit()

    async def create_suppression_group(self, db: AsyncSession, store_id: str, name: str, description: str, is_default: bool = False):
        provider, settings = await self._get_provider_for_store(db, store_id)
        if isinstance(provider, SendGridClient):
            res = await provider.create_suppression_group(name, description, is_default)
            from app.models.sendgrid_data import SendgridSuppressionGroup
            new_sg = SendgridSuppressionGroup(store_id=store_id, sg_group_id=int(res.get("id")), name=res.get("name", ""), description=res.get("description", ""), is_default=res.get("is_default", False))
            db.add(new_sg)
            await db.commit()
            return res
        return {"id": 1, "name": name, "description": description, "is_default": is_default}

    async def sync_pending_contacts(self, db: AsyncSession, store_id: str):
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings:
            logger.warning(f"Store {store_id} missing email settings for contact sync.")
            return

        try:
            provider = EmailProviderFactory.get_provider(settings)
        except Exception as e:
            logger.warning(f"Could not initialize provider for contact sync in store {store_id}: {e}")
            return

        pending = await self.contact_repo.get_pending_sync_contacts(db)
        store_pending = [c for c in pending if str(c.store_id) == str(store_id)]
        
        if not store_pending:
            return

        from collections import defaultdict
        grouped_contacts = defaultdict(list)
        default_list = settings.mailgun_default_list_address or settings.sendgrid_default_list_id
        
        for contact in store_pending:
            target_list_id = contact.sendgrid_list_id or default_list
            grouped_contacts[target_list_id or 'no_list'].append(contact)

        for list_id, group in grouped_contacts.items():
            formatted_contacts = []
            for contact in group:
                data = {"email": contact.email}
                if contact.first_name: data["first_name"] = contact.first_name
                if contact.last_name: data["last_name"] = contact.last_name
                formatted_contacts.append(data)

            try:
                await provider.add_or_update_contacts(list_id, formatted_contacts)
                for contact in group:
                    await self.contact_repo.update(db, contact, {"sync_status": "synced"})
                logger.info(f"Successfully synced {len(group)} contacts for store {store_id}")
            except Exception as e:
                logger.error(f"Failed to sync contacts for store {store_id}: {e}")
                for contact in group:
                    await self.contact_repo.update(db, contact, {"sync_status": "failed"})

    async def create_campaign(
        self,
        db: AsyncSession,
        store_id: str,
        name: str,
        subject: str,
        list_id: str,
        sender_id: Optional[int] = 1,
        suppression_group_id: Optional[int] = None,
        custom_unsubscribe_url: Optional[str] = None,
        html_content: str = "",
        **kwargs
    ):
        provider, settings = await self._get_provider_for_store(db, store_id)
        
        campaign_id_ref = None
        
        if isinstance(provider, SendGridClient):
            response = await provider.create_single_send(
                name=name,
                subject=subject,
                list_id=list_id,
                sender_id=sender_id or 1,
                suppression_group_id=suppression_group_id,
                custom_unsubscribe_url=custom_unsubscribe_url,
                html_content=html_content
            )
            campaign_id_ref = response.get("id")
        else:
            # For Mailgun, campaign reference is handled natively in local DB
            import uuid
            campaign_id_ref = f"mg_{uuid.uuid4().hex[:12]}"

        campaign_data = {
            "store_id": store_id,
            "sendgrid_campaign_id": campaign_id_ref,
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
        
        default_list_id = settings.sendgrid_default_list_id or settings.mailgun_default_list_address
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
            provider, settings = await self._get_provider_for_store(db, store_id)
            if isinstance(provider, SendGridClient):
                try:
                    await provider.update_single_send(
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

    async def schedule_campaign(self, db: AsyncSession, store_id: str, campaign_id: str):
        provider, settings = await self._get_provider_for_store(db, store_id)
        campaign = await self.campaign_repo.get_by_id(db, campaign_id)
        if not campaign or str(campaign.store_id) != str(store_id):
            raise ValueError("Campaign not found or does not belong to this store.")

        if campaign.status not in {"draft", "scheduled"}:
            raise ValueError(f"This campaign cannot be scheduled because its current status is '{campaign.status}'.")

        # Fetch contacts linked to this campaign
        from sqlalchemy.future import select
        from app.models.email_contact import EmailContact
        from app.models.email_campaign_contact import EmailCampaignContact

        res = await db.execute(
            select(EmailContact).join(EmailCampaignContact).where(EmailCampaignContact.campaign_id == campaign.id)
        )
        contacts = res.scalars().all()

        if not contacts:
            raise ValueError("Cannot schedule campaign with no contacts.")

        # Warmup Scheduling Engine
        if campaign.is_warmup:
            WARMUP_SCHEDULE = [45, 90, 180, 360, 720, 1440, 2880, 5760, 11520, 23040, 46080, 50000]
            chunks = []
            remaining = list(contacts)
            day_idx = 0
            while remaining:
                limit = WARMUP_SCHEDULE[day_idx] if day_idx < len(WARMUP_SCHEDULE) else WARMUP_SCHEDULE[-1]
                chunks.append(remaining[:limit])
                remaining = remaining[limit:]
                day_idx += 1

            first_scheduled_at = None

            for idx, chunk in enumerate(chunks):
                day = idx + 1
                send_time = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=idx)
                if idx == 0:
                    first_scheduled_at = send_time

                chunk_recipients = [{"email": c.email, "first_name": c.first_name, "last_name": c.last_name, "id": str(c.id)} for c in chunk]

                child_campaign_id = None

                if isinstance(provider, MailgunClient):
                    # Mailgun scheduled batch with warmup tag
                    tag = f"warmup-day-{day}"
                    send_time_rfc = send_time.strftime("%a, %d %b %Y %H:%M:%S GMT")
                    await provider.send_batch_email(
                        recipients=chunk_recipients,
                        subject=campaign.subject or campaign.name,
                        html_content=f"<p>{campaign.subject or campaign.name}</p>",
                        from_email=settings.from_email or f"noreply@{settings.mailgun_domain}",
                        from_name=settings.from_name,
                        scheduled_at=send_time_rfc if idx > 0 else None,
                        campaign_name=f"{campaign.name} - Day {day}",
                        tags=["warmup", tag]
                    )
                    child_campaign_id = f"mg_warmup_{campaign.id}_{day}"
                else:
                    # SendGrid single send creation per warmup day
                    new_list_name = f"{campaign.name} - Warmup Day {day}"
                    new_list = await provider.create_list(new_list_name)
                    new_list_id = new_list.get("id")
                    await provider.add_or_update_contacts(new_list_id, chunk_recipients)
                    
                    sub_camp = await provider.create_single_send(
                        name=f"{campaign.name} - Day {day}",
                        subject=campaign.subject,
                        list_id=new_list_id,
                        sender_id=1,
                        html_content=""
                    )
                    send_time_str = send_time.strftime("%Y-%m-%dT%H:%M:%SZ") if idx > 0 else "now"
                    await provider.schedule_single_send(sub_camp.get("id"), send_time_str)
                    child_campaign_id = sub_camp.get("id")

                child_data = {
                    "store_id": store_id,
                    "sendgrid_campaign_id": child_campaign_id,
                    "name": f"{campaign.name} - Day {day}",
                    "subject": campaign.subject,
                    "status": "scheduled",
                    "parent_id": campaign.id,
                    "warmup_day": day,
                    "scheduled_at": send_time
                }
                await self.campaign_repo.create(db, child_data)

            updated_campaign = await self.campaign_repo.update(db, campaign, {
                "status": "scheduled",
                "scheduled_at": first_scheduled_at
            })
            await self._log_campaign_run(db, store_id, campaign_id, "scheduled", "completed", "Warmup campaign scheduled across stages")
            return updated_campaign

        else:
            # Regular (Non-warmup) Campaign Send
            if isinstance(provider, MailgunClient):
                recipients = [{"email": c.email, "first_name": c.first_name, "last_name": c.last_name, "id": str(c.id)} for c in contacts]
                await provider.send_batch_email(
                    recipients=recipients,
                    subject=campaign.subject or campaign.name,
                    html_content=f"<p>{campaign.subject or campaign.name}</p>",
                    from_email=settings.from_email or f"noreply@{settings.mailgun_domain}",
                    from_name=settings.from_name,
                    campaign_name=campaign.name,
                    tags=["campaign"]
                )
            else:
                await provider.schedule_single_send(campaign.sendgrid_campaign_id)

            now_dt = datetime.datetime.now(datetime.timezone.utc)
            updated_campaign = await self.campaign_repo.update(db, campaign, {
                "status": "sent",
                "scheduled_at": now_dt
            })
            await self._log_campaign_run(db, store_id, campaign_id, "scheduled", "completed", "Campaign sent live successfully")
            return updated_campaign

    async def run_live_campaign(self, db: AsyncSession, store_id: str, campaign_id: str):
        campaign = await self.campaign_repo.get_by_id(db, campaign_id)
        if not campaign or str(campaign.store_id) != str(store_id):
            raise ValueError("Campaign not found or does not belong to this store.")

        if campaign.is_warmup or campaign.status == "warming_up" or campaign.parent_id is not None:
            raise ValueError("Cannot run this campaign live while it is in warm-up freeze.")

        if campaign.status not in {"draft", "scheduled"}:
            raise ValueError(f"This campaign cannot be scheduled again because its current status is '{campaign.status}'.")

        result = await self.schedule_campaign(db, store_id, campaign_id)
        await self._log_campaign_run(db, store_id, campaign_id, "manual_run", "completed", "Campaign started live")
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

    async def get_campaign_stats(self, db: AsyncSession, store_id: str, campaign_ids: list[str] = None):
        provider, settings = await self._get_provider_for_store(db, store_id)
        return await provider.get_campaign_stats(campaign_ids)

    async def send_transactional_email(self, db: AsyncSession, store_id: str, to_email: str, subject: str, html_content: str, from_name: str = None):
        provider, settings = await self._get_provider_for_store(db, store_id)
        
        from_email = settings.from_email
        if not from_email:
            if isinstance(provider, MailgunClient):
                from_email = f"noreply@{settings.mailgun_domain}"
            else:
                raise ValueError("Store missing 'from_email' setting.")

        response = await provider.send_transactional_email(
            to_email=to_email,
            subject=subject,
            html_content=html_content,
            from_email=from_email,
            from_name=from_name or settings.from_name
        )

        from app.repositories.email_tracking_repo import EmailTrackingRepository
        tracking_repo = EmailTrackingRepository()
        log_data = {
            "store_id": store_id,
            "sendgrid_msg_id": response.get("message_id", "unknown"),
            "provider": getattr(settings, "provider", "mailgun"),
            "event_type": "transactional_sent"
        }
        await tracking_repo.create(db, log_data)
        
        return response

    async def check_domain_dns(self, db: AsyncSession, store_id: str) -> Dict[str, Any]:
        """Check domain DNS records and deliverability status (Mailgun)"""
        provider, settings = await self._get_provider_for_store(db, store_id)
        return await provider.check_domain_dns()

    async def get_ip_warmup_status(self, db: AsyncSession, store_id: str) -> Dict[str, Any]:
        """Check Dedicated IP warmup status (Mailgun)"""
        provider, settings = await self._get_provider_for_store(db, store_id)
        return await provider.get_ip_warmup_status()

    async def toggle_ip_warmup(self, db: AsyncSession, store_id: str, ip_address: str, enable: bool = True) -> Dict[str, Any]:
        """Toggle dedicated IP warmup (Mailgun)"""
        provider, settings = await self._get_provider_for_store(db, store_id)
        if isinstance(provider, MailgunClient):
            return await provider.toggle_ip_warmup(ip_address, enable)
        return {"status": "not_supported", "message": "IP warmup toggling is not supported on this provider"}

    async def sync_campaigns_status(self, db: AsyncSession, store_id: str):
        from sqlalchemy.future import select
        from app.models.email_campaign import EmailCampaign
        settings = await self.setting_repo.get_by_store_id(db, store_id)
        if not settings:
            return
            
        try:
            provider = EmailProviderFactory.get_provider(settings)
        except Exception:
            return

        # Check SendGrid single sends
        if isinstance(provider, SendGridClient):
            res = await db.execute(select(EmailCampaign).where(EmailCampaign.store_id == store_id, EmailCampaign.status == "scheduled"))
            campaigns = res.scalars().all()
            for c in campaigns:
                if c.sendgrid_campaign_id and not c.sendgrid_campaign_id.startswith("mg_"):
                    try:
                        sg_camp = await provider.get_single_send(c.sendgrid_campaign_id)
                        sg_status = sg_camp.get("status")
                        if sg_status and sg_status.lower() in ["triggered", "done"]:
                            await self.campaign_repo.update(db, c, {"status": "sent"})
                    except Exception as e:
                        logger.error(f"Failed to check status for {c.sendgrid_campaign_id}: {e}")

    async def sync_sendgrid_data(self, db: AsyncSession, store_id: str):
        """Sync lists, senders, and suppression groups from active provider into local DB"""
        from app.models.sendgrid_data import SendgridList, SendgridSender, SendgridSuppressionGroup
        from sqlalchemy.future import select
        
        provider, settings = await self._get_provider_for_store(db, store_id)
        
        import asyncio
        lists_data, senders_data, supp_data = await asyncio.gather(
            provider.get_lists(),
            provider.get_senders(),
            provider.get_suppression_groups(),
            return_exceptions=True
        )
        
        if isinstance(lists_data, Exception): lists_data = []
        if isinstance(senders_data, Exception): senders_data = []
        if isinstance(supp_data, Exception): supp_data = []

        # Upsert Lists
        for l in lists_data:
            list_id_str = str(l.get("id") or l.get("address"))
            existing = await db.scalar(select(SendgridList).where(SendgridList.sg_list_id == list_id_str))
            if existing:
                existing.name = l.get("name", "")
                existing.contact_count = l.get("contact_count", 0)
            else:
                new_list = SendgridList(store_id=store_id, sg_list_id=list_id_str, name=l.get("name", ""), contact_count=l.get("contact_count", 0))
                db.add(new_list)

        # Upsert Senders
        for s in senders_data:
            sender_id = int(s.get("id", 1))
            existing = await db.scalar(select(SendgridSender).where(SendgridSender.sg_sender_id == sender_id))
            from_info = s.get("from", {})
            from_email = from_info.get("email", "") if isinstance(from_info, dict) else str(from_info)
            from_name = from_info.get("name") if isinstance(from_info, dict) else None
            if existing:
                existing.nickname = s.get("nickname")
                existing.from_email = from_email
                existing.from_name = from_name
            else:
                new_sender = SendgridSender(store_id=store_id, sg_sender_id=sender_id, nickname=s.get("nickname"), from_email=from_email, from_name=from_name)
                db.add(new_sender)

        # Upsert Suppression Groups
        for sg in supp_data:
            sg_id = int(sg.get("id", 1))
            existing = await db.scalar(select(SendgridSuppressionGroup).where(SendgridSuppressionGroup.sg_group_id == sg_id))
            if existing:
                existing.name = sg.get("name", "")
                existing.description = sg.get("description", "")
                existing.is_default = sg.get("is_default", False)
            else:
                new_sg = SendgridSuppressionGroup(store_id=store_id, sg_group_id=sg_id, name=sg.get("name", ""), description=sg.get("description", ""), is_default=sg.get("is_default", False))
                db.add(new_sg)

        await db.commit()
        return {"message": "Sync completed successfully"}
