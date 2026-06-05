from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.core.dependencies import get_db, get_active_store
from app.models.store import Store
from app.models.email_contact import EmailContact
from app.jobs.email_validation_job import run_email_validation_job
import asyncio

router = APIRouter(prefix="/api/v1/email-validation", tags=["Email Validation"])

@router.post("/start", status_code=202)
async def start_email_validation(
    active_store: Store = Depends(get_active_store)
):
    """
    Manually trigger the email validation background job.
    """
    if not active_store:
        raise HTTPException(status_code=400, detail="Store not found.")
        
    # Trigger background task asynchronously
    asyncio.create_task(run_email_validation_job())
    return {"message": "Email validation job started in the background."}

@router.get("/stats")
async def get_email_validation_stats(
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store)
):
    """
    Get statistics of email validation for the current store.
    """
    if not active_store:
        raise HTTPException(status_code=400, detail="Store not found.")

    query = select(EmailContact.validation_status, func.count(EmailContact.id)).where(
        EmailContact.store_id == active_store.id
    ).group_by(EmailContact.validation_status)
    
    result = await db.execute(query)
    stats_raw = result.all()
    
    stats = {
        "valid": 0,
        "risky": 0,
        "invalid": 0,
        "pending": 0,
        "total": 0
    }
    
    for status, count in stats_raw:
        if status in stats:
            stats[status] = count
        stats["total"] += count
        
    return stats

@router.get("/contacts")
async def get_validation_contacts(
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store)
):
    """
    Get paginated email contacts with their validation details.
    """
    if not active_store:
        raise HTTPException(status_code=400, detail="Store not found.")

    query = select(EmailContact).where(
        EmailContact.store_id == active_store.id
    ).order_by(EmailContact.created_at.desc()).offset(skip).limit(limit)
    
    result = await db.execute(query)
    contacts = result.scalars().all()
    
    # Get total count
    count_query = select(func.count(EmailContact.id)).where(EmailContact.store_id == active_store.id)
    total = await db.scalar(count_query)
    
    return {
        "data": contacts,
        "total": total,
        "skip": skip,
        "limit": limit
    }


from app.services.email_validation_service import EmailValidationService
from uuid import UUID

@router.post("/validate/{contact_id}")
async def validate_single_contact(
    contact_id: UUID,
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store)
):
    """
    Immediately validate a single email contact.
    """
    if not active_store:
        raise HTTPException(status_code=400, detail="Store not found.")
        
    contact = await db.get(EmailContact, contact_id)
    if not contact or contact.store_id != active_store.id:
        raise HTTPException(status_code=404, detail="Contact not found.")
        
    service = EmailValidationService()
    
    # We validate even if it's already valid to allow re-validation
    from app.repositories.email_setting_repo import EmailSettingRepository
    settings_repo = EmailSettingRepository()
    settings = await settings_repo.get_by_store_id(db, str(active_store.id))
    
    check_smtp = settings.validate_smtp if settings else False
    check_mx = settings.validate_mx if settings else True
    check_spelling = settings.validate_spelling if settings else True

    try:
        is_valid, reason, details = await service.validate_email(
            contact.email, 
            check_smtp=check_smtp,
            check_mx=check_mx,
            check_syntax=check_spelling
        )
        
        status = "valid"
        if not is_valid:
            if "Timeout" in reason or "disposable" in reason.lower() or "temporary" in reason.lower():
                status = "risky"
            else:
                status = "invalid"
                
        contact.validation_status = status
        contact.validation_reason = reason
        contact.has_mx = details.get("has_mx")
        contact.smtp_valid = details.get("smtp_valid")
        
        await db.commit()
        await db.refresh(contact)
        return contact
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
