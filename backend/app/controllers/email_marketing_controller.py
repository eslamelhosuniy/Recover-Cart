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

router = APIRouter(prefix="/email-marketing", tags=["Email Marketing"])

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
            contact_data = contact.model_dump()
            contact_data["store_id"] = store_id
            contact_data["sendgrid_list_id"] = contact.list_id
            await repo.create(db, contact_data)
        return {"message": f"{len(contact_in)} contacts added to sync queue"}
    else:
        contact_data = contact_in.model_dump()
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
    reader = csv.DictReader(decoded)
    
    count = 0
    for row in reader:
        if not row.get("email"): continue
        data = {
            "store_id": store_id,
            "email": row["email"].strip(),
            "first_name": row.get("first_name"),
            "last_name": row.get("last_name"),
            "sendgrid_list_id": list_id
        }
        await repo.create(db, data)
        count += 1
        
    return {"message": f"{count} contacts uploaded and added to sync queue"}


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

@router.post("/campaigns/{store_id}/{campaign_id}/send")
async def send_campaign(store_id: UUID, campaign_id: UUID, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    await get_store_for_user(store_id, db, current_user)
    try:
        await EmailMarketingService().schedule_campaign(db, str(store_id), str(campaign_id))
        return {"message": "Campaign scheduled for sending"}
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
