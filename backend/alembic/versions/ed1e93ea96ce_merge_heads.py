"""merge heads

Revision ID: ed1e93ea96ce
Revises: c159bc765b79
Create Date: 2026-05-29 16:04:16.824045

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ed1e93ea96ce'
down_revision: Union[str, None] = 'c159bc765b79'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
