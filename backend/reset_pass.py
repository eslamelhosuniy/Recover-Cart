import asyncio
from app.core.database import AsyncSessionLocal
from app.models.user import User
from sqlalchemy.future import select
from app.core.security import hash_password

async def main():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.username == 'admin'))
        user = result.scalars().first()
        if user:
            user.hashed_password = hash_password('123123123')
            await db.commit()
            print('Password reset to 123123123')
        else:
            print('User admin not found, creating it...')
            new_user = User(
                username='admin',
                email='admin@admin.com',
                hashed_password=hash_password('123123123'),
                is_admin=True,
                is_active=True
            )
            db.add(new_user)
            await db.commit()
            print('User admin created with 123123123')

if __name__ == '__main__':
    asyncio.run(main())
