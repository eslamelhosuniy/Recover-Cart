from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List
from uuid import UUID

from app.core.dependencies import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.store import Store
from app.schemas.store_schema import StoreCreate, StoreUpdate, StoreResponse
from app.repositories.store_repository import StoreRepository

router = APIRouter(prefix="/api/v1/stores", tags=["Stores"])
store_repo = StoreRepository()

@router.get("", response_model=List[StoreResponse])
async def list_stores(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.is_admin:
        # Admins can see all stores
        result = await db.execute(select(Store))
        return list(result.scalars().all())
    else:
        # Normal users can only see their own stores
        return await store_repo.get_by_owner_id(db, current_user.id)

@router.post("", response_model=StoreResponse, status_code=status.HTTP_201_CREATED)
async def create_store(
    payload: StoreCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Enforce limit of 3 stores for normal users
    if not current_user.is_admin:
        store_count = await store_repo.get_count_by_owner_id(db, current_user.id)
        if store_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="لا يمكن إضافة أكثر من 3 متاجر للحساب العادي."
            )
            
    # Check if salla_store_id is already registered
    if payload.salla_store_id:
        existing = await store_repo.get_by_salla_store_id(db, payload.salla_store_id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="هذا المتجر مسجل بالفعل في النظام."
            )

    new_store = Store(
        owner_id=current_user.id,
        store_name=payload.store_name,
        salla_store_id=payload.salla_store_id,
        salla_webhook_secret=payload.salla_webhook_secret,
        whatsapp_phone_id=payload.whatsapp_phone_id,
        whatsapp_access_token=payload.whatsapp_access_token,
        whatsapp_webhook_verify_token=payload.whatsapp_webhook_verify_token,
        whatsapp_template_name=payload.whatsapp_template_name,
        coupon_code=payload.coupon_code,
        reminder_image_url=payload.reminder_image_url,
        automation_enabled=payload.automation_enabled,
        reminder_delay_hours=payload.reminder_delay_hours,
        max_retries=payload.max_retries,
        is_active=payload.is_active
    )
    
    db.add(new_store)
    await db.commit()
    await db.refresh(new_store)
    return new_store

@router.get("/{id}", response_model=StoreResponse)
async def get_store(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    store = await store_repo.get_by_id(db, id)
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المتجر غير موجود.")
        
    if not current_user.is_admin and store.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية للوصول إلى هذا المتجر.")
        
    return store

@router.put("/{id}", response_model=StoreResponse)
async def update_store(
    id: UUID,
    payload: StoreUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    store = await store_repo.get_by_id(db, id)
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المتجر غير موجود.")
        
    if not current_user.is_admin and store.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية لتعديل هذا المتجر.")
        
    # Update only fields provided in payload
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(store, key, value)
        
    await db.commit()
    await db.refresh(store)
    return store

@router.delete("/{id}")
async def delete_store(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="صلاحية حذف المتجر متاحة للمشرفين فقط."
        )
        
    store = await store_repo.get_by_id(db, id)
    if not store:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="المتجر غير موجود.")
        
    await db.delete(store)
    await db.commit()
    return {"status": "success", "message": "تم حذف المتجر بنجاح."}
