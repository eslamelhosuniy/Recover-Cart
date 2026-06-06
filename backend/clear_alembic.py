from sqlalchemy import create_engine
from sqlalchemy import text
from dotenv import load_dotenv
import os

load_dotenv()
url = os.getenv('DATABASE_URL')
# Convert asyncpg URL to sync if needed
if 'postgresql+asyncpg' in url:
    url = url.replace('postgresql+asyncpg', 'postgresql')

engine = create_engine(url)
with engine.begin() as conn:
    conn.execute(text("DELETE FROM alembic_version;"))
    conn.execute(text("INSERT INTO alembic_version (version_num) VALUES ('9beaaf7dbb1e');"))
    print('Alembic version set to 9beaaf7dbb1e')
