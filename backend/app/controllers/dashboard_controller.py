from fastapi import APIRouter, Depends, Query
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import get_db, get_active_store
from app.core.security import get_current_user
from app.services.analytics_service import AnalyticsService
from app.schemas.dashboard_schema import DashboardKPIs
from app.models.user import User
from app.models.store import Store
from app.utils.date_helpers import parse_date_range

router = APIRouter(prefix="/api/v1/dashboard", tags=["Dashboard"])


@router.get("/kpis", response_model=DashboardKPIs)
async def get_kpis(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store),
):
    start_dt, end_dt = parse_date_range(start_date, end_date)
    return await AnalyticsService.get_kpis(db, store_id=active_store.id, start_date=start_dt, end_date=end_dt)


@router.get("/next-job")
async def get_next_job(
    current_user: User = Depends(get_current_user),
):
    from app.jobs.scheduler import scheduler
    
    response = {"next_run_time": None, "next_review_run_time": None}
    
    # Get reminder job next run time
    reminder_job = scheduler.get_job("hourly_reminder_job")
    if reminder_job and reminder_job.next_run_time:
        response["next_run_time"] = reminder_job.next_run_time.isoformat()
    
    # Get review request job next run time
    review_job = scheduler.get_job("review_request_job")
    if review_job and review_job.next_run_time:
        response["next_review_run_time"] = review_job.next_run_time.isoformat()
    
    return response

