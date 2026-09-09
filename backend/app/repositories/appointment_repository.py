from app.repositories.base_repository import BaseRepository
from app.models.appointment import Appointment
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func, or_, and_
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone, timedelta
from uuid import UUID


class AppointmentRepository(BaseRepository[Appointment]):
    def __init__(self):
        super().__init__(Appointment)

    async def get_by_ghl_id(
        self, db: AsyncSession, ghl_appointment_id: str, store_id: Optional[UUID] = None
    ) -> Optional[Appointment]:
        query = select(self.model).where(self.model.ghl_appointment_id == ghl_appointment_id)
        if store_id:
            query = query.where(self.model.store_id == store_id)
        result = await db.execute(query)
        return result.scalars().first()

    async def get_all_appointments(
        self,
        db: AsyncSession,
        store_id: UUID,
        skip: int = 0,
        limit: int = 10,
        status: Optional[str] = None,
        search: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> List[Appointment]:
        query = select(self.model).where(self.model.store_id == store_id)

        if status:
            if status == "reminded":
                query = query.where(self.model.reminder_sent == True)
            elif status == "upcoming":
                now = datetime.now(timezone.utc)
                query = query.where(
                    and_(
                        self.model.start_time >= now,
                        self.model.status.in_(["booked", "confirmed"])
                    )
                )
            else:
                query = query.where(self.model.status == status)

        if search:
            clean_search = search.strip()
            search_pattern = f"%{clean_search}%"
            search_conditions = [
                self.model.customer_name.ilike(search_pattern),
                self.model.customer_phone.ilike(search_pattern),
                self.model.customer_email.ilike(search_pattern),
                self.model.calendar_name.ilike(search_pattern),
                self.model.ghl_appointment_id.ilike(search_pattern),
            ]
            if clean_search.startswith("0") and len(clean_search) > 3:
                search_conditions.append(self.model.customer_phone.ilike(f"%{clean_search.lstrip('0')}%"))
            elif clean_search.startswith("+"):
                search_conditions.append(self.model.customer_phone.ilike(f"%{clean_search.lstrip('+')}%"))

            query = query.where(or_(*search_conditions))

        if start_date:
            query = query.where(self.model.start_time >= start_date)
        if end_date:
            query = query.where(self.model.start_time <= end_date)

        query = query.order_by(self.model.start_time.desc()).offset(skip).limit(limit)
        result = await db.execute(query)
        return list(result.scalars().all())

    async def count_appointments(
        self,
        db: AsyncSession,
        store_id: UUID,
        status: Optional[str] = None,
        search: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> int:
        query = select(func.count(self.model.id)).where(self.model.store_id == store_id)

        if status:
            if status == "reminded":
                query = query.where(self.model.reminder_sent == True)
            elif status == "upcoming":
                now = datetime.now(timezone.utc)
                query = query.where(
                    and_(
                        self.model.start_time >= now,
                        self.model.status.in_(["booked", "confirmed"])
                    )
                )
            else:
                query = query.where(self.model.status == status)

        if search:
            clean_search = search.strip()
            search_pattern = f"%{clean_search}%"
            search_conditions = [
                self.model.customer_name.ilike(search_pattern),
                self.model.customer_phone.ilike(search_pattern),
                self.model.customer_email.ilike(search_pattern),
                self.model.calendar_name.ilike(search_pattern),
                self.model.ghl_appointment_id.ilike(search_pattern),
            ]
            if clean_search.startswith("0") and len(clean_search) > 3:
                search_conditions.append(self.model.customer_phone.ilike(f"%{clean_search.lstrip('0')}%"))
            elif clean_search.startswith("+"):
                search_conditions.append(self.model.customer_phone.ilike(f"%{clean_search.lstrip('+')}%"))

            query = query.where(or_(*search_conditions))

        if start_date:
            query = query.where(self.model.start_time >= start_date)
        if end_date:
            query = query.where(self.model.start_time <= end_date)

        result = await db.execute(query)
        return result.scalar() or 0

    async def get_pending_scheduled_reminders(
        self,
        db: AsyncSession,
        store_id: UUID,
        reminder_hours_before: int = 1,
        reminder_minutes_before: Optional[int] = None,
    ) -> List[Appointment]:
        """
        Find appointments where:
        - status is booked or confirmed
        - reminder_sent is False
        - start_time is in the future
        - start_time - now <= reminder threshold (minutes or hours)
        """
        now = datetime.now(timezone.utc)
        if reminder_minutes_before is not None:
            threshold = now + timedelta(minutes=reminder_minutes_before)
        else:
            threshold = now + timedelta(hours=reminder_hours_before)

        query = (
            select(self.model)
            .where(
                and_(
                    self.model.store_id == store_id,
                    self.model.reminder_sent == False,
                    self.model.status.in_(["booked", "confirmed"]),
                    self.model.start_time > now,
                    self.model.start_time <= threshold,
                )
            )
            .order_by(self.model.start_time.asc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_stats(self, db: AsyncSession, store_id: UUID) -> Dict[str, int]:
        now = datetime.now(timezone.utc)

        total_q = select(func.count(self.model.id)).where(self.model.store_id == store_id)
        upcoming_q = select(func.count(self.model.id)).where(
            and_(
                self.model.store_id == store_id,
                self.model.start_time >= now,
                self.model.status.in_(["booked", "confirmed"]),
            )
        )
        confirmed_q = select(func.count(self.model.id)).where(
            and_(
                self.model.store_id == store_id,
                self.model.status.in_(["booked", "confirmed"]),
            )
        )
        reminded_q = select(func.count(self.model.id)).where(
            and_(
                self.model.store_id == store_id,
                self.model.reminder_sent == True,
            )
        )
        cancelled_q = select(func.count(self.model.id)).where(
            and_(
                self.model.store_id == store_id,
                self.model.status.in_(["cancelled", "canceled", "noshow", "no_show"]),
            )
        )

        total = (await db.execute(total_q)).scalar() or 0
        upcoming = (await db.execute(upcoming_q)).scalar() or 0
        confirmed = (await db.execute(confirmed_q)).scalar() or 0
        reminded = (await db.execute(reminded_q)).scalar() or 0
        cancelled = (await db.execute(cancelled_q)).scalar() or 0

        return {
            "total": total,
            "upcoming": upcoming,
            "confirmed": confirmed,
            "reminded": reminded,
            "cancelled": cancelled,
        }
