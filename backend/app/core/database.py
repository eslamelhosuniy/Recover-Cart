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
    future=True,
    pool_pre_ping=True,      # فحص الاتصال قبل استخدامه (لحل مشكلة انقطاع الاتصال)
    pool_recycle=1800,       # إعادة تدوير الاتصالات كل 30 دقيقة
    pool_size=5,             # عدد الاتصالات الأساسية
    max_overflow=10,         # أقصى عدد للاتصالات الإضافية وقت الذروة
    pool_timeout=30          # الانتظار حتى 30 ثانية للاتصال (مهم جداً أثناء استيقاظ Neon)
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()
