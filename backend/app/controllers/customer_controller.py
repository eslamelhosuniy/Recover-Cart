from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from typing import List, Optional
from uuid import UUID

from app.core.dependencies import get_db, get_active_store
from app.models.store import Store
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer_schema import CustomerResponse
from app.schemas.cart_schema import CartResponse
from app.schemas.common import PaginatedResponse
from app.models.customer import Customer
from app.models.abandoned_cart import AbandonedCart
from app.utils.date_helpers import parse_date_range

router = APIRouter(prefix="/api/v1/customers", tags=["Customers"])
customer_repo = CustomerRepository()


@router.get("", response_model=PaginatedResponse[CustomerResponse])
async def get_customers(
    skip: int = 0, 
    limit: int = 10, 
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store)
):
    start_dt, end_dt = parse_date_range(start_date, end_date)
    customers = await customer_repo.get_all(
        db, 
        store_id=active_store.id, 
        skip=skip, 
        limit=limit,
        start_date=start_dt,
        end_date=end_dt
    )
    
    count_query = select(func.count(Customer.id)).where(Customer.store_id == active_store.id)
    if start_dt:
        count_query = count_query.where(Customer.created_at >= start_dt)
    if end_dt:
        count_query = count_query.where(Customer.created_at <= end_dt)

    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0
    return PaginatedResponse(
        data=customers,
        total=total,
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=limit,
    )


@router.get("/{id}", response_model=CustomerResponse)
async def get_customer(
    id: UUID, 
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store)
):
    customer = await customer_repo.get_by_id(db, id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
        
    if customer.store_id != active_store.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this customer")
        
    return customer


@router.get("/{id}/carts", response_model=List[CartResponse])
async def get_customer_carts(
    id: UUID, 
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store)
):
    customer = await customer_repo.get_by_id(db, id)
    if not customer:
        raise HTTPException(status_code=404, detail="العميل غير موجود")
        
    if customer.store_id != active_store.id:
        raise HTTPException(status_code=403, detail="ليس لديك صلاحية للوصول لبيانات هذا العميل")

    result = await db.execute(
        select(AbandonedCart)
        .where(AbandonedCart.customer_id == id)
        .where(AbandonedCart.store_id == active_store.id)
        .options(selectinload(AbandonedCart.customer))
        .options(selectinload(AbandonedCart.recovered_details))
        .options(selectinload(AbandonedCart.messages))
        .order_by(AbandonedCart.abandoned_at.desc())
    )
    return result.scalars().all()

