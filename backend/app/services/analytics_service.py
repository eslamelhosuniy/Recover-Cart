from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.models.abandoned_cart import AbandonedCart
from app.schemas.dashboard_schema import DashboardKPIs

class AnalyticsService:
    @staticmethod
    async def get_kpis(db: AsyncSession) -> DashboardKPIs:
        total_carts_result = await db.execute(select(func.count(AbandonedCart.id)))
        total_carts = total_carts_result.scalar() or 0
        
        recovered_carts_result = await db.execute(select(func.count(AbandonedCart.id)).where(AbandonedCart.is_recovered == True))
        recovered_carts = recovered_carts_result.scalar() or 0
        
        recovery_rate = (recovered_carts / total_carts * 100) if total_carts > 0 else 0.0
        
        revenue_result = await db.execute(select(func.sum(AbandonedCart.cart_value)).where(AbandonedCart.is_recovered == True))
        total_revenue_recovered = float(revenue_result.scalar() or 0.0)
        
        return DashboardKPIs(
            total_carts=total_carts,
            recovered_carts=recovered_carts,
            recovery_rate=round(recovery_rate, 2),
            total_revenue_recovered=total_revenue_recovered
        )
