from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db
from app.core.security import get_current_user
from app.services.analytics_service import AnalyticsService
from app.schemas.dashboard_schema import DashboardKPIs
from app.models.user import User

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


@router.get("/kpis", response_model=DashboardKPIs)
async def get_kpis(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await AnalyticsService.get_kpis(db, user_id=current_user.id)


@router.get("/next-job")
async def get_next_job(
    current_user: User = Depends(get_current_user),
):
    from app.jobs.scheduler import scheduler
    job = scheduler.get_job("hourly_reminder_job")
    if job and job.next_run_time:
        return {"next_run_time": job.next_run_time.isoformat()}
    return {"next_run_time": None}
