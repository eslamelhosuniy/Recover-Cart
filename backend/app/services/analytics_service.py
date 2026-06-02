from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from uuid import UUID
from datetime import datetime
from typing import Optional
from app.models.abandoned_cart import AbandonedCart
from app.models.recovered_cart import RecoveredCart
from app.models.message_log import MessageLog
from app.schemas.dashboard_schema import DashboardKPIs


class AnalyticsService:
    @staticmethod
    async def get_kpis(
        db: AsyncSession, 
        store_id: UUID,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> DashboardKPIs:
        """All KPIs are scoped to the store context."""

        total_carts_q = (
            select(func.count(AbandonedCart.id))
            .where(AbandonedCart.store_id == store_id)
        )
        if start_date:
            total_carts_q = total_carts_q.where(AbandonedCart.abandoned_at >= start_date)
        if end_date:
            total_carts_q = total_carts_q.where(AbandonedCart.abandoned_at <= end_date)

        total_carts_result = await db.execute(total_carts_q)
        total_carts = total_carts_result.scalar() or 0

        recovered_carts_q = (
            select(func.count(AbandonedCart.id))
            .where(AbandonedCart.store_id == store_id)
            .where(AbandonedCart.is_recovered == True)
        )
        if start_date:
            recovered_carts_q = recovered_carts_q.where(AbandonedCart.abandoned_at >= start_date)
        if end_date:
            recovered_carts_q = recovered_carts_q.where(AbandonedCart.abandoned_at <= end_date)

        recovered_carts_result = await db.execute(recovered_carts_q)
        recovered_carts = recovered_carts_result.scalar() or 0

        left_carts = total_carts - recovered_carts

        recovery_rate = (recovered_carts / total_carts * 100) if total_carts > 0 else 0.0

        revenue_q = (
            select(func.sum(RecoveredCart.total))
            .join(AbandonedCart, AbandonedCart.id == RecoveredCart.cart_id)
            .where(AbandonedCart.store_id == store_id)
            .where(AbandonedCart.is_recovered == True)
        )
        if start_date:
            revenue_q = revenue_q.where(AbandonedCart.abandoned_at >= start_date)
        if end_date:
            revenue_q = revenue_q.where(AbandonedCart.abandoned_at <= end_date)

        revenue_result = await db.execute(revenue_q)
        total_revenue_recovered = float(revenue_result.scalar() or 0.0)

        # 1. successfully received WhatsApp message (unique customers who have at least one successfully sent/delivered/read message in this period)
        received_q = (
            select(func.count(func.distinct(AbandonedCart.customer_id)))
            .join(MessageLog, AbandonedCart.id == MessageLog.cart_id)
            .where(AbandonedCart.store_id == store_id)
            .where(MessageLog.status.in_(["accepted", "sent", "delivered", "read"]))
        )
        if start_date:
            received_q = received_q.where(AbandonedCart.abandoned_at >= start_date)
        if end_date:
            received_q = received_q.where(AbandonedCart.abandoned_at <= end_date)
            
        received_result = await db.execute(received_q)
        received_messages_customers = received_result.scalar() or 0

        # 2. didn't receive messages (unique customers with carts in the period who have NO successful messages in this period)
        received_cust_subquery = (
            select(AbandonedCart.customer_id)
            .join(MessageLog, AbandonedCart.id == MessageLog.cart_id)
            .where(AbandonedCart.store_id == store_id)
            .where(MessageLog.status.in_(["accepted", "sent", "delivered", "read"]))
        )
        if start_date:
            received_cust_subquery = received_cust_subquery.where(AbandonedCart.abandoned_at >= start_date)
        if end_date:
            received_cust_subquery = received_cust_subquery.where(AbandonedCart.abandoned_at <= end_date)

        not_received_q = (
            select(func.count(func.distinct(AbandonedCart.customer_id)))
            .where(AbandonedCart.store_id == store_id)
            .where(AbandonedCart.customer_id.not_in(received_cust_subquery))
        )
        if start_date:
            not_received_q = not_received_q.where(AbandonedCart.abandoned_at >= start_date)
        if end_date:
            not_received_q = not_received_q.where(AbandonedCart.abandoned_at <= end_date)

        not_received_result = await db.execute(not_received_q)
        not_received_messages_customers = not_received_result.scalar() or 0


        return DashboardKPIs(
            total_carts=total_carts,
            recovered_carts=recovered_carts,
            left_carts=left_carts,
            recovery_rate=round(recovery_rate, 2),
            total_revenue_recovered=total_revenue_recovered,
            received_messages_customers=received_messages_customers,
            not_received_messages_customers=not_received_messages_customers,
        )

