from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.repositories.customer_repository import CustomerRepository
from app.schemas.customer_schema import CustomerResponse
from app.schemas.common import PaginatedResponse
from uuid import UUID

router = APIRouter(prefix="/api/v1/customers", tags=["Customers"])
customer_repo = CustomerRepository()

@router.get("", response_model=PaginatedResponse[CustomerResponse])
async def get_customers(skip: int = 0, limit: int = 10, db: AsyncSession = Depends(get_db)):
    customers = await customer_repo.get_all(db, skip=skip, limit=limit)
    return PaginatedResponse(
        data=customers,
        total=len(customers),
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=limit
    )

@router.get("/{id}", response_model=CustomerResponse)
async def get_customer(id: UUID, db: AsyncSession = Depends(get_db)):
    customer = await customer_repo.get_by_id(db, id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer
