"""add_mailgun_provider_settings

Revision ID: 20260910_mailgun_provider
Revises: 20260908_ghl_appts
Create Date: 2026-09-10 13:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20260910_mailgun_provider'
down_revision: Union[str, None] = '20260908_ghl_appts'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add Mailgun columns to email_store_settings table
    op.add_column('email_store_settings', sa.Column('provider', sa.String(), server_default='mailgun', nullable=False))
    op.add_column('email_store_settings', sa.Column('mailgun_api_key', sa.String(), nullable=True))
    op.add_column('email_store_settings', sa.Column('mailgun_domain', sa.String(), nullable=True))
    op.add_column('email_store_settings', sa.Column('mailgun_region', sa.String(), server_default='us', nullable=False))
    op.add_column('email_store_settings', sa.Column('mailgun_webhook_signing_key', sa.String(), nullable=True))
    op.add_column('email_store_settings', sa.Column('mailgun_default_list_address', sa.String(), nullable=True))
    op.add_column('email_store_settings', sa.Column('mailgun_ip_pool', sa.String(), nullable=True))

    # Add provider column to email_tracking_logs table
    op.add_column('email_tracking_logs', sa.Column('provider', sa.String(), server_default='mailgun', nullable=True))


def downgrade() -> None:
    op.drop_column('email_tracking_logs', 'provider')

    op.drop_column('email_store_settings', 'mailgun_ip_pool')
    op.drop_column('email_store_settings', 'mailgun_default_list_address')
    op.drop_column('email_store_settings', 'mailgun_webhook_signing_key')
    op.drop_column('email_store_settings', 'mailgun_region')
    op.drop_column('email_store_settings', 'mailgun_domain')
    op.drop_column('email_store_settings', 'mailgun_api_key')
    op.drop_column('email_store_settings', 'provider')
