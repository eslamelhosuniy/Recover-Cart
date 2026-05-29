from typing import AsyncGenerator, Optional
from fastapi import Header, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal
from app.models.store import Store
from app.models.user import User
from app.core.security import get_current_user
from uuid import UUID

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session

async def get_active_store(
    x_store_id: Optional[str] = Header(None, alias="X-Store-ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
) -> Store:
    if not x_store_id or x_store_id == "null" or x_store_id == "undefined":
        if current_user.is_admin:
            result = await db.execute(select(Store).order_by(Store.created_at.asc()).limit(1))
            store = result.scalars().first()
        else:
            result = await db.execute(select(Store).where(Store.owner_id == current_user.id).order_by(Store.created_at.asc()).limit(1))
            store = result.scalars().first()
            
        if not store:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="لا توجد متاجر مسجلة في الحساب حالياً."
            )
        return store

    try:
        store_uuid = UUID(x_store_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="اسم معرف المتجر غير صالح."
        )
    
    result = await db.execute(select(Store).where(Store.id == store_uuid))
    store = result.scalars().first()
    if not store:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="المتجر غير موجود."
        )
        
    if not current_user.is_admin and store.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="ليس لديك صلاحية للوصول إلى هذا المتجر."
        )
        
    return store

