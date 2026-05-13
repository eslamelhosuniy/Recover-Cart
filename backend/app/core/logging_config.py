import logging
import sys
from app.config import settings

def setup_logging():
    log_level = logging.DEBUG if settings.app_env == "development" else logging.INFO
    
    logging.basicConfig(
        stream=sys.stdout,
        level=log_level,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    )
