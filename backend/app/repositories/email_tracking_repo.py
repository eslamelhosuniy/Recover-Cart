from app.models.email_tracking import EmailTrackingLog
from app.repositories.base_repository import BaseRepository

class EmailTrackingRepository(BaseRepository[EmailTrackingLog]):
    def __init__(self):
        super().__init__(EmailTrackingLog)
