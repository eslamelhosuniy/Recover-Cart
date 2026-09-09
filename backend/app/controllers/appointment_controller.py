from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional, List
from uuid import UUID

from app.core.dependencies import get_db, get_active_store
from app.models.store import Store
from app.schemas.appointment_schema import (
    AppointmentResponse,
    AppointmentStatsResponse,
    ManualReminderRequest
)
from app.schemas.common import PaginatedResponse
from app.repositories.appointment_repository import AppointmentRepository
from app.services.ghl_appointment_service import GHLAppointmentService
from app.utils.date_helpers import parse_date_range

router = APIRouter(prefix="/api/v1/appointments", tags=["GoHighLevel Appointments"])
appointment_repo = AppointmentRepository()
ghl_service = GHLAppointmentService()

MAX_LIMIT = 100


@router.get("", response_model=PaginatedResponse[AppointmentResponse])
async def list_appointments(
    skip: int = 0,
    limit: int = 10,
    status: Optional[str] = Query(None, description="Filter by status (booked, confirmed, cancelled, reminded, upcoming)"),
    search: Optional[str] = Query(None, description="Search by customer name, phone, email, or calendar"),
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store),
):
    limit = min(limit, MAX_LIMIT)
    start_dt, end_dt = parse_date_range(start_date, end_date)

    appointments = await appointment_repo.get_all_appointments(
        db=db,
        store_id=active_store.id,
        skip=skip,
        limit=limit,
        status=status,
        search=search,
        start_date=start_dt,
        end_date=end_dt
    )

    total = await appointment_repo.count_appointments(
        db=db,
        store_id=active_store.id,
        status=status,
        search=search,
        start_date=start_dt,
        end_date=end_dt
    )

    return PaginatedResponse(
        data=appointments,
        total=total,
        page=(skip // limit) + 1 if limit > 0 else 1,
        size=limit,
    )


@router.get("/stats", response_model=AppointmentStatsResponse)
async def get_appointment_stats(
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store),
):
    stats = await appointment_repo.get_stats(db, active_store.id)
    return AppointmentStatsResponse(**stats)


@router.get("/{id}", response_model=AppointmentResponse)
async def get_appointment(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store),
):
    appointment = await appointment_repo.get_by_id(db, id)
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="الموعد غير موجود.")

    if appointment.store_id != active_store.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية للوصول إلى هذا الموعد.")

    return appointment


@router.post("/{id}/send-reminder")
async def send_manual_reminder(
    id: UUID,
    payload: Optional[ManualReminderRequest] = None,
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store),
):
    """
    Manually triggers an instant reminder via WhatsApp from the UI.
    """
    appointment = await appointment_repo.get_by_id(db, id)
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="الموعد غير موجود.")

    if appointment.store_id != active_store.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية لإرسال تذكير لهذا الموعد.")

    template_name = payload.template_name if payload else None
    try:
        success = await ghl_service.send_manual_reminder(db, id, template_name=template_name)
        return {
            "status": "success",
            "message": "تم إرسال رسالة التذكير عبر الواتساب بنجاح!",
            "appointment_id": str(id),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"فشل إرسال التذكير: {str(e)}"
        )


@router.post("/{id}/send-confirmation")
async def send_confirmation(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store),
):
    appointment = await appointment_repo.get_by_id(db, id)
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="الموعد غير موجود.")

    if appointment.store_id != active_store.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية لإرسال تأكيد لهذا الموعد.")

    try:
        success = await ghl_service.send_instant_confirmation(db, id)
        return {
            "status": "success",
            "message": "تم إرسال رسالة التأكيد عبر الواتساب بنجاح!",
            "appointment_id": str(id),
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"فشل إرسال رسالة التأكيد: {str(e)}"
        )


@router.delete("/{id}")
async def delete_appointment(
    id: UUID,
    db: AsyncSession = Depends(get_db),
    active_store: Store = Depends(get_active_store),
):
    appointment = await appointment_repo.get_by_id(db, id)
    if not appointment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="الموعد غير موجود.")

    if appointment.store_id != active_store.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ليس لديك صلاحية لحذف هذا الموعد.")

    await appointment_repo.delete(db, id)
    return {"status": "success", "message": "تم حذف الموعد بنجاح."}
