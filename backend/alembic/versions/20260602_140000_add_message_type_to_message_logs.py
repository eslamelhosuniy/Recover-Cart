"""Add message_type column to message_logs.

Revision ID: 20260602_140000
Revises: 20260602_130000
Create Date: 2026-06-02 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260602_140000"
down_revision: Union[str, None] = "20260602_130000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add message_type column with default value "abandoned_reminder"
    op.add_column(
        'message_logs',
        sa.Column('message_type', sa.String(), nullable=False, server_default="abandoned_reminder")
    )


def downgrade() -> None:
    # Remove message_type column
    op.drop_column('message_logs', 'message_type')
