from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.repositories.settings_repository import SettingsRepository
from app.schemas.settings_schema import SettingsResponse, SettingsUpdate, SettingsCreate, EventNameUpdate
from app.config import settings

router = APIRouter(prefix="/api/v1/settings", tags=["Settings"])
settings_repo = SettingsRepository()

@router.get("", response_model=SettingsResponse)
async def get_settings(db: AsyncSession = Depends(get_db)):
    settings = await settings_repo.get_current_settings(db)
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not configured")
    return settings

@router.post("", response_model=SettingsResponse)
async def create_settings(settings_in: SettingsCreate, db: AsyncSession = Depends(get_db)):
    existing = await settings_repo.get_current_settings(db)
    if existing:
        raise HTTPException(status_code=400, detail="Settings already exist. Use PUT to update.")
    return await settings_repo.create(db, settings_in.model_dump())

@router.put("", response_model=SettingsResponse)
async def update_settings(settings_in: SettingsUpdate, db: AsyncSession = Depends(get_db)):
    settings = await settings_repo.get_current_settings(db)
    if not settings:
        raise HTTPException(status_code=404, detail="Settings not configured")
    return await settings_repo.update(db, settings, settings_in.model_dump(exclude_unset=True))

@router.patch("/event-name")
async def update_event_name(payload: EventNameUpdate):
    """
    Update the Salla event name at runtime.
    """
    settings.set_event_name(payload.event_name)
    return {
        "status": "success",
        "message": "Event name updated successfully at runtime",
        "new_event_name": settings.event_name
    }
