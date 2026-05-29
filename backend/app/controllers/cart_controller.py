from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.core.dependencies import get_db
from app.repositories.cart_repository import CartRepository
from app.schemas.cart_schema import CartResponse
from app.schemas.common import PaginatedResponse
from uuid import UUID
from app.services.reminder_service import ReminderService
from app.models.abandoned_cart import AbandonedCart

from app.core.dependencies import get_active_store
from app.models.store import Store

from app.utils.date_helpers import parse_date_range

router = APIRouter(prefix="/api/v1/carts", tags=["Carts"])
cart_repo = CartRepository()
reminder_service = ReminderService()


@router.get("", response_model=PaginatedResponse[CartResponse])
async def get_carts(
    skip: int = 0, 
    limit: int = 10, 
    status: Optional[str] = Query(None, description="Filter by status: 'recovered' or 'abandoned'"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store)
):
    start_dt, end_dt = parse_date_range(start_date, end_date)
    carts = await cart_repo.get_all(
        db, 
        store_id=active_store.id, 
        skip=skip, 
        limit=limit, 
        status=status,
        start_date=start_dt,
        end_date=end_dt
    )
    
    count_query = select(func.count(AbandonedCart.id)).where(AbandonedCart.store_id == active_store.id)
    if status == "recovered":
        count_query = count_query.where(AbandonedCart.is_recovered == True)
    elif status == "abandoned":
        count_query = count_query.where(AbandonedCart.is_recovered == False)
        
    if start_dt:
        count_query = count_query.where(AbandonedCart.abandoned_at >= start_dt)
    if end_dt:
        count_query = count_query.where(AbandonedCart.abandoned_at <= end_dt)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    return PaginatedResponse(
        data=carts,
        total=total,
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=limit,
    )


@router.get("/{id}", response_model=CartResponse)
async def get_cart(
    id: UUID, 
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store)
):
    cart = await cart_repo.get_by_id(db, id)
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
        
    if cart.store_id != active_store.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this cart")
        
    return cart


@router.post("/{id}/remind")
async def send_manual_reminder(
    id: UUID, 
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store)
):
    cart = await cart_repo.get_by_id(db, id)
    if not cart:
        raise HTTPException(status_code=404, detail="السلة غير موجودة.")
        
    # ownership check
    if cart.store_id != active_store.id:
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية للوصول لهذه السلة.")
        
    # double recovery check
    if cart.is_recovered:
        raise HTTPException(status_code=400, detail="تم استرجاع هذه السلة بالفعل ولا تحتاج لتذكير.")
        
    # already notified check
    if cart.reminder_sent:
        raise HTTPException(status_code=400, detail="تم إرسال تذكير لهذه السلة مسبقاً.")

    try:
        await reminder_service.send_reminder_for_cart(db, cart)
        return {"status": "success", "message": "تم إرسال تذكير واتساب اليدوي بنجاح"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

