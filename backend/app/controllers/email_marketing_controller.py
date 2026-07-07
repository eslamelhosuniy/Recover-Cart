from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID

from app.core.dependencies import get_db
from app.schemas.email_schemas import EmailSettingCreate, EmailSettingResponse, EmailContactCreate, EmailCampaignCreate, SingleEmailSend, EmailListCreate, SuppressionGroupCreate
from app.repositories.email_setting_repo import EmailSettingRepository
from app.repositories.email_contact_repo import EmailContactRepository
from app.services.email_marketing_service import EmailMarketingService
from app.core.security import get_current_user
from app.models.user import User
from app.repositories.store_repository import StoreRepository

router = APIRouter(prefix="/api/v1/email-marketing", tags=["Email Marketing"])

async def get_store_for_user(store_id: UUID, db: AsyncSession, current_user: User):
    store_repo = StoreRepository()
    store = await store_repo.get_by_id(db, store_id)
    if not store or store.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this store")
    return store

@router.get("/settings/{store_id}", response_model=EmailSettingResponse)
async def get_settings(store_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    repo = EmailSettingRepository()
    settings = await repo.get_by_store_id(db, str(store_id))
    if not settings:
        raise HTTPException(status_code=404, detail="Email settings not found")
    return settings

@router.put("/settings/{store_id}", response_model=EmailSettingResponse)
async def update_settings(store_id: UUID, settings_in: EmailSettingCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    repo = EmailSettingRepository()
    settings = await repo.get_by_store_id(db, str(store_id))
    if not settings:
        settings_data = settings_in.model_dump()
        settings_data["store_id"] = store_id
        return await repo.create(db, settings_data)
    return await repo.update(db, settings, settings_in.model_dump(exclude_unset=True))

from typing import Union, List
import csv
from fastapi import File, UploadFile, Form

@router.post("/contacts/{store_id}")
async def create_contact(
    store_id: UUID, 
    contact_in: Union[EmailContactCreate, List[EmailContactCreate]], 
    db: AsyncSession = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    await get_store_for_user(store_id, db, current_user)
    repo = EmailContactRepository()
    
    if isinstance(contact_in, list):
        for contact in contact_in:
            contact_data = contact.model_dump(exclude={"list_id"})
            contact_data["store_id"] = store_id
            contact_data["sendgrid_list_id"] = contact.list_id
            await repo.create(db, contact_data)
        return {"message": f"{len(contact_in)} contacts added to sync queue"}
    else:
        contact_data = contact_in.model_dump(exclude={"list_id"})
        contact_data["store_id"] = store_id
        contact_data["sendgrid_list_id"] = contact_in.list_id
        await repo.create(db, contact_data)
        return {"message": "Contact added to sync queue"}

@router.post("/contacts/{store_id}/upload")
async def upload_contacts_csv(
    store_id: UUID,
    file: UploadFile = File(...),
    list_id: str = Form(None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await get_store_for_user(store_id, db, current_user)
    repo = EmailContactRepository()
    
    content = await file.read()
    decoded = content.decode('utf-8-sig').splitlines()
    reader = csv.reader(decoded)
    
    # Read headers
    headers = next(reader, None)
    if not headers:
        return {"message": "Empty file uploaded"}
        
    # Find column indices
    email_idx = -1
    first_name_idx = -1
    last_name_idx = -1
    
    for idx, col in enumerate(headers):
        col_clean = col.lower().strip()
        if "email" in col_clean or "mail" in col_clean:
            email_idx = idx
        elif "first" in col_clean or "الاسم الأول" in col_clean:
            first_name_idx = idx
        elif "last" in col_clean or "الاسم الأخير" in col_clean:
            last_name_idx = idx
            
    # Fallback to the first column if no email header is detected
    if email_idx == -1:
        email_idx = 0
        
    count = 0
    for row in reader:
        if not row or len(row) <= email_idx:
            continue
        email = row[email_idx].strip()
        if not email or "@" not in email:
            continue
            
        first_name = row[first_name_idx].strip() if (first_name_idx != -1 and len(row) > first_name_idx) else None
        last_name = row[last_name_idx].strip() if (last_name_idx != -1 and len(row) > last_name_idx) else None
        
        # Check if contact already exists to avoid unique constraint crashes
        existing = await repo.get_by_email_and_store(db, str(store_id), email)
        if existing:
            update_data = {}
            if first_name:
                update_data["first_name"] = first_name
            if last_name:
                update_data["last_name"] = last_name
            if list_id:
                update_data["sendgrid_list_id"] = list_id
            if update_data:
                await repo.update(db, existing, update_data)
        else:
            data = {
                "store_id": store_id,
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "sendgrid_list_id": list_id
            }
            await repo.create(db, data)
        count += 1
        
    return {"message": f"{count} contacts uploaded and processed"}


@router.post("/campaigns/{store_id}")
async def create_campaign(store_id: UUID, campaign_in: EmailCampaignCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    service = EmailMarketingService()
    try:
        campaign = await service.create_campaign(
            db, str(store_id), campaign_in.name, campaign_in.subject, 
            campaign_in.list_id, campaign_in.sender_id,
            campaign_in.suppression_group_id, campaign_in.custom_unsubscribe_url,
            campaign_in.html_content
        )
        return {"message": "Campaign created", "campaign_id": campaign.id}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

from app.schemas.email_schemas import CampaignUpdate

@router.put("/campaigns/{store_id}/{campaign_id}")
async def update_campaign(store_id: UUID, campaign_id: UUID, campaign_in: CampaignUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        updated = await EmailMarketingService().update_campaign(db, str(store_id), str(campaign_id), campaign_in.model_dump(exclude_unset=True))
        return {"message": "Campaign updated", "campaign": updated}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/senders/{store_id}")
async def get_senders(store_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        return await EmailMarketingService().get_senders(db, str(store_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/lists/{store_id}")
async def get_lists(store_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        return await EmailMarketingService().get_lists(db, str(store_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/lists/{store_id}")
async def create_list(store_id: UUID, list_in: EmailListCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        return await EmailMarketingService().create_list(db, str(store_id), list_in.name)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/lists/{store_id}/{list_id}")
async def delete_list(store_id: UUID, list_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        await EmailMarketingService().delete_list(db, str(store_id), list_id)
        return {"message": "List deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/suppression-groups/{store_id}")
async def get_suppression_groups(store_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        return await EmailMarketingService().get_suppression_groups(db, str(store_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/suppression-groups/{store_id}")
async def create_suppression_group(store_id: UUID, group_in: SuppressionGroupCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        return await EmailMarketingService().create_suppression_group(db, str(store_id), group_in.name, group_in.description, group_in.is_default)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/suppression-groups/{store_id}/{group_id}")
async def delete_suppression_group(store_id: UUID, group_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        await EmailMarketingService().delete_suppression_group(db, str(store_id), group_id)
        return {"message": "Suppression group deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/designs/{store_id}")
async def get_designs(store_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        return await EmailMarketingService().get_designs(db, str(store_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/designs/{store_id}/{design_id}")
async def get_design(store_id: UUID, design_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        return await EmailMarketingService().get_design(db, str(store_id), design_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/designs/{store_id}/{design_id}")
async def delete_design(store_id: UUID, design_id: str, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        await EmailMarketingService().delete_design(db, str(store_id), design_id)
        return {"message": "Design deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/campaigns/{store_id}/{campaign_id}/send")
async def send_campaign(store_id: UUID, campaign_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        await EmailMarketingService().schedule_campaign(db, str(store_id), str(campaign_id))
        return {"message": "Campaign scheduled for sending"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/campaigns/{store_id}/{campaign_id}/run-live")
async def run_live_campaign(store_id: UUID, campaign_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        await EmailMarketingService().run_live_campaign(db, str(store_id), str(campaign_id))
        return {"message": "Campaign started live"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/campaigns/{store_id}/{campaign_id}/runs")
async def get_campaign_runs(store_id: UUID, campaign_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        return await EmailMarketingService().get_campaign_run_logs(db, str(store_id), str(campaign_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/send-email/{store_id}")
async def send_transactional_email(store_id: UUID, email_in: SingleEmailSend, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        response = await EmailMarketingService().send_transactional_email(
            db, str(store_id), email_in.to_email, email_in.subject, email_in.html_content, email_in.from_name
        )
        return {"message": "Email queued for sending", "details": response}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


from sqlalchemy.future import select
from sqlalchemy import or_, and_, desc, func
from datetime import datetime
from app.models.email_contact import EmailContact
from app.models.email_campaign_contact import EmailCampaignContact
from app.models.email_campaign import EmailCampaign
from typing import Optional
from pydantic import BaseModel

@router.get("/contacts-list/{store_id}")
async def get_contacts_list(
    store_id: UUID,
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    list_id: Optional[str] = None,
    campaign_id: Optional[UUID] = None,
    sent_in_campaigns: Optional[bool] = None,
    validation_status: Optional[str] = None,
    sync_status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await get_store_for_user(store_id, db, current_user)
    
    query = select(EmailContact).where(EmailContact.store_id == store_id)
    
    if search:
        query = query.where(or_(
            EmailContact.email.ilike(f"%{search}%"),
            EmailContact.first_name.ilike(f"%{search}%"),
            EmailContact.last_name.ilike(f"%{search}%")
        ))
    
    if list_id:
        query = query.where(EmailContact.sendgrid_list_id == list_id)
        
    if validation_status:
        query = query.where(EmailContact.validation_status == validation_status)
        
    if sync_status:
        query = query.where(EmailContact.sync_status == sync_status)
        
    if start_date:
        try:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
            query = query.where(EmailContact.created_at >= start_dt)
        except ValueError:
            pass
            
    if end_date:
        try:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
            query = query.where(EmailContact.created_at <= end_dt)
        except ValueError:
            pass

    if campaign_id:
        query = query.join(EmailCampaignContact).where(EmailCampaignContact.campaign_id == campaign_id)
    elif sent_in_campaigns is True:
        query = query.join(EmailCampaignContact)
    elif sent_in_campaigns is False:
        query = query.outerjoin(EmailCampaignContact).where(EmailCampaignContact.campaign_id == None)

    # Order
    query = query.order_by(desc(EmailContact.created_at))
    
    # Get total count
    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    
    # Get items
    query = query.offset(skip).limit(limit)
    result = await db.execute(query)
    contacts = result.scalars().unique().all()
    
    return {
        "total": total,
        "data": contacts
    }

@router.get("/contacts/{store_id}/by-list/{list_id}")
async def get_contacts_by_list(
    store_id: UUID,
    list_id: str,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await get_store_for_user(store_id, db, current_user)
    try:
        return await EmailMarketingService().get_contacts_by_list(db, str(store_id), list_id, skip, limit)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

class ContactUpdateInfo(BaseModel):
    email: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    list_id: Optional[str] = None

@router.put("/contacts/{store_id}/{contact_id}")
async def update_contact(
    store_id: UUID,
    contact_id: UUID,
    update_data: ContactUpdateInfo,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await get_store_for_user(store_id, db, current_user)
    
    contact = await db.get(EmailContact, contact_id)
    if not contact or contact.store_id != store_id:
        raise HTTPException(status_code=404, detail="Contact not found")
        
    if update_data.email is not None: contact.email = update_data.email
    if update_data.first_name is not None: contact.first_name = update_data.first_name
    if update_data.last_name is not None: contact.last_name = update_data.last_name
    if update_data.list_id is not None: contact.sendgrid_list_id = update_data.list_id
    
    contact.sync_status = "pending"
    await db.commit()
    await db.refresh(contact)
    
    try:
        from app.services.email_marketing_service import EmailMarketingService
        await EmailMarketingService().sync_pending_contacts(db, str(store_id))
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to trigger sync: {e}")
        
    return contact

@router.delete("/contacts/{store_id}/{contact_id}")
async def delete_contact(
    store_id: UUID,
    contact_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await get_store_for_user(store_id, db, current_user)
    try:
        await EmailMarketingService().delete_contact(db, str(store_id), str(contact_id))
        return {"message": "Contact deleted"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/campaigns/{store_id}")
async def get_campaigns(
    store_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await get_store_for_user(store_id, db, current_user)
    
    # Sync statuses silently
    try:
        from app.services.email_marketing_service import EmailMarketingService
        await EmailMarketingService().sync_campaigns_status(db, str(store_id))
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Failed to sync campaigns status: {e}")
        
    result = await db.execute(select(EmailCampaign).where(and_(EmailCampaign.store_id == store_id, EmailCampaign.parent_id == None)).order_by(desc(EmailCampaign.created_at)))
    return result.scalars().all()

@router.get("/campaigns/{store_id}/{campaign_id}/children")
async def get_child_campaigns(
    store_id: UUID,
    campaign_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await get_store_for_user(store_id, db, current_user)
    result = await db.execute(select(EmailCampaign).where(and_(EmailCampaign.store_id == store_id, EmailCampaign.parent_id == campaign_id)).order_by(EmailCampaign.warmup_day))
    return result.scalars().all()


@router.get("/campaigns/{store_id}/stats")
async def get_campaigns_stats(
    store_id: UUID,
    campaign_ids: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await get_store_for_user(store_id, db, current_user)
    try:
        ids_list = campaign_ids.split(",") if campaign_ids else None
        return await EmailMarketingService().get_campaign_stats(db, str(store_id), ids_list)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/sync-sendgrid/{store_id}")
async def sync_sendgrid(
    store_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    await get_store_for_user(store_id, db, current_user)
    service = EmailMarketingService()
    try:
        return await service.sync_sendgrid_data(db, str(store_id))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
