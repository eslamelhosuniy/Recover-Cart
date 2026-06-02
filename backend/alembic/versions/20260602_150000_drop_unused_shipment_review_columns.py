"""Drop unused shipment review columns from stores table

Revision ID: 20260602_150000
Revises: 20260602_140000
Create Date: 2026-06-02 15:00:00.000000

These columns were replaced by the new review_request_* fields and are no longer used.
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '20260602_150000'
down_revision = '20260602_140000'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop the three unused shipment review columns
    op.drop_column('stores', 'shipment_review_enabled')
    op.drop_column('stores', 'shipment_review_delay_hours')
    op.drop_column('stores', 'shipment_review_template_name')


def downgrade() -> None:
    # Restore the columns if migration is rolled back
    op.add_column(
        'stores',
        sa.Column('shipment_review_template_name', sa.String(), nullable=False, server_default="shipment_review")
    )
    op.add_column(
        'stores',
        sa.Column('shipment_review_delay_hours', sa.Integer(), nullable=False, server_default='24')
    )
    op.add_column(
        'stores',
        sa.Column('shipment_review_enabled', sa.Boolean(), nullable=False, server_default='true')
    )
