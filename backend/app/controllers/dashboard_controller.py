from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.services.analytics_service import AnalyticsService
from app.schemas.dashboard_schema import DashboardKPIs

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])

@router.get("/kpis", response_model=DashboardKPIs)
async def get_kpis(db: AsyncSession = Depends(get_db)):
    return await AnalyticsService.get_kpis(db)
