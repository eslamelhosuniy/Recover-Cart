from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from app.config import settings

# Handle asyncpg SSL requirement (it uses 'ssl' instead of 'sslmode')
db_url = settings.database_url
if "sslmode=" in db_url:
    db_url = db_url.replace("sslmode=", "ssl=")

engine = create_async_engine(
    db_url,
    echo=(settings.app_env == "development"),
    future=True
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()
