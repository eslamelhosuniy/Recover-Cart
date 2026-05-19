from pydantic import BaseModel
from typing import List

class DashboardKPIs(BaseModel):
    total_carts: int
    recovered_carts: int
    left_carts: int
    recovery_rate: float
    total_revenue_recovered: float

class ChartDataPoint(BaseModel):
    label: str
    value: float

class ChartResponse(BaseModel):
    title: str
    data: List[ChartDataPoint]
