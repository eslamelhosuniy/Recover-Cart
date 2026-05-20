from datetime import date, datetime, time, timezone
from typing import Optional, Tuple

def parse_date_range(start_date_str: Optional[str], end_date_str: Optional[str]) -> Tuple[Optional[datetime], Optional[datetime]]:
    """
    Parses start and end date strings into timezone-aware datetime objects in UTC.
    If input is 'YYYY-MM-DD', sets start_date to 00:00:00 and end_date to 23:59:59.999999.
    """
    start_dt = None
    end_dt = None
    if start_date_str:
        try:
            # Try parsing YYYY-MM-DD
            d = date.fromisoformat(start_date_str)
            start_dt = datetime.combine(d, time.min).replace(tzinfo=timezone.utc)
        except ValueError:
            # Fallback to ISO datetime
            try:
                start_dt = datetime.fromisoformat(start_date_str)
            except ValueError:
                pass
    if end_date_str:
        try:
            d = date.fromisoformat(end_date_str)
            end_dt = datetime.combine(d, time.max).replace(tzinfo=timezone.utc)
        except ValueError:
            try:
                end_dt = datetime.fromisoformat(end_date_str)
            except ValueError:
                pass
    return start_dt, end_dt
