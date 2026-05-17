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

router = APIRouter(prefix="/api/v1/carts", tags=["Carts"])
cart_repo = CartRepository()
reminder_service = ReminderService()


@router.get("", response_model=PaginatedResponse[CartResponse])
async def get_carts(skip: int = 0, limit: int = 10, db: AsyncSession = Depends(get_db)):
    carts = await cart_repo.get_all(db, skip=skip, limit=limit)
    total_result = await db.execute(select(func.count(AbandonedCart.id)))
    total = total_result.scalar() or 0
    return PaginatedResponse(
        data=carts,
        total=total,
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=limit,
    )


@router.get("/{id}", response_model=CartResponse)
async def get_cart(id: UUID, db: AsyncSession = Depends(get_db)):
    cart = await cart_repo.get_by_id(db, id)
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")
    return cart


@router.post("/{id}/remind")
async def send_manual_reminder(id: UUID, db: AsyncSession = Depends(get_db)):
    try:
        await reminder_service.send_manual_reminder(db, id)
        return {"status": "success", "message": "Reminder sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
