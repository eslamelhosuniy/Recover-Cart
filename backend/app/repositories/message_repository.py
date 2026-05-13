from app.repositories.base_repository import BaseRepository
from app.models.message_log import MessageLog

class MessageRepository(BaseRepository[MessageLog]):
    def __init__(self):
        super().__init__(MessageLog)
