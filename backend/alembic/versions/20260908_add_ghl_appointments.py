"""add_ghl_appointments

Revision ID: 20260908_ghl_appts
Revises: 2ca7dd2a34cc
Create Date: 2026-09-08 22:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20260908_ghl_appts'
down_revision: Union[str, None] = '2ca7dd2a34cc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create appointments table
    op.create_table(
        'appointments',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('store_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('stores.id', ondelete='CASCADE'), nullable=False),
        sa.Column('ghl_appointment_id', sa.String(), nullable=False),
        sa.Column('ghl_calendar_id', sa.String(), nullable=True),
        sa.Column('ghl_contact_id', sa.String(), nullable=True),
        sa.Column('ghl_location_id', sa.String(), nullable=True),
        sa.Column('ghl_workflow_id', sa.String(), nullable=True),
        sa.Column('calendar_name', sa.String(), nullable=True),
        sa.Column('customer_name', sa.String(), nullable=False),
        sa.Column('customer_phone', sa.String(), nullable=False),
        sa.Column('customer_email', sa.String(), nullable=True),
        sa.Column('customer_timezone', sa.String(), nullable=True, server_default='Africa/Cairo'),
        sa.Column('meeting_url', sa.String(), nullable=True),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=False),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('selected_timezone', sa.String(), nullable=True, server_default='Asia/Kuwait'),
        sa.Column('status', sa.String(), nullable=False, server_default='booked'),
        sa.Column('appointment_status', sa.String(), nullable=True, server_default='confirmed'),
        sa.Column('confirmation_sent', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('confirmation_sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('reminder_sent', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('reminder_sent_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('manual_reminders_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_manual_reminder_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('raw_payload', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
    )

    op.create_index(op.f('ix_appointments_store_id'), 'appointments', ['store_id'], unique=False)
    op.create_index(op.f('ix_appointments_ghl_appointment_id'), 'appointments', ['ghl_appointment_id'], unique=False)
    op.create_index(op.f('ix_appointments_ghl_calendar_id'), 'appointments', ['ghl_calendar_id'], unique=False)
    op.create_index(op.f('ix_appointments_ghl_contact_id'), 'appointments', ['ghl_contact_id'], unique=False)
    op.create_index(op.f('ix_appointments_customer_phone'), 'appointments', ['customer_phone'], unique=False)
    op.create_index(op.f('ix_appointments_start_time'), 'appointments', ['start_time'], unique=False)

    # 2. Add GHL settings columns to stores table
    op.add_column('stores', sa.Column('ghl_automation_enabled', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('stores', sa.Column('ghl_instant_reminder_enabled', sa.Boolean(), server_default='true', nullable=False))
    op.add_column('stores', sa.Column('ghl_reminder_hours_before', sa.Integer(), server_default='1', nullable=False))
    op.add_column('stores', sa.Column('ghl_reminder_template_name', sa.String(), server_default='appointment_reminder', nullable=False))
    op.add_column('stores', sa.Column('ghl_confirmation_template_name', sa.String(), server_default='appointment_confirmation', nullable=False))

    # 3. Add appointment_id to message_logs and make cart_id nullable
    op.add_column('message_logs', sa.Column('appointment_id', postgresql.UUID(as_uuid=True), sa.ForeignKey('appointments.id', ondelete='CASCADE'), nullable=True))
    op.alter_column('message_logs', 'cart_id', existing_type=postgresql.UUID(as_uuid=True), nullable=True)


def downgrade() -> None:
    op.alter_column('message_logs', 'cart_id', existing_type=postgresql.UUID(as_uuid=True), nullable=False)
    op.drop_column('message_logs', 'appointment_id')

    op.drop_column('stores', 'ghl_confirmation_template_name')
    op.drop_column('stores', 'ghl_reminder_template_name')
    op.drop_column('stores', 'ghl_reminder_hours_before')
    op.drop_column('stores', 'ghl_instant_reminder_enabled')
    op.drop_column('stores', 'ghl_automation_enabled')

    op.drop_index(op.f('ix_appointments_start_time'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_customer_phone'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_ghl_contact_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_ghl_calendar_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_ghl_appointment_id'), table_name='appointments')
    op.drop_index(op.f('ix_appointments_store_id'), table_name='appointments')
    op.drop_table('appointments')
