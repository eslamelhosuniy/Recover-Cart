from fastapi import APIRouter, Depends, HTTPException
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

from app.core.security import get_current_user
from app.models.user import User

router = APIRouter(prefix="/api/v1/carts", tags=["Carts"])
cart_repo = CartRepository()
reminder_service = ReminderService()


@router.get("", response_model=PaginatedResponse[CartResponse])
async def get_carts(
    skip: int = 0, 
    limit: int = 10, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    carts = await cart_repo.get_all(db, user_id=current_user.id, skip=skip, limit=limit)
    total_result = await db.execute(
        select(func.count(AbandonedCart.id))
        .where(AbandonedCart.user_id == current_user.id)
    )
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
    current_user: User = Depends(get_current_user)
):
    cart = await cart_repo.get_by_id(db, id)
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
        
    if cart.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to view this cart")
        
    return cart


@router.post("/{id}/remind")
async def send_manual_reminder(
    id: UUID, 
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    cart = await cart_repo.get_by_id(db, id)
    if not cart:
        raise HTTPException(status_code=404, detail="السلة غير موجودة.")
        
    # ownership check
    if cart.user_id != current_user.id:
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
