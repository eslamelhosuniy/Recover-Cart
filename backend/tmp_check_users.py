import asyncio
import asyncpg
from app.config import settings

async def main():
    dsn = settings.database_url.replace('postgresql+asyncpg://', 'postgresql://')
    conn = await asyncpg.connect(dsn)
    rows = await conn.fetch('SELECT id, username, email, is_active, is_admin FROM users')
    print([dict(r) for r in rows])
    await conn.close()

asyncio.run(main())
