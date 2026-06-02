"""Drop legacy shipment tables.

Revision ID: 20260602_130000
Revises: 20260602_120000
Create Date: 2026-06-02 13:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260602_130000"
down_revision: Union[str, None] = "20260602_120000"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop shipment_message_logs first (it has FK to shipment_reviews_archive)
    op.drop_table("shipment_message_logs")
    
    # Then drop shipment_reviews_archive
    op.drop_table("shipment_reviews_archive")


def downgrade() -> None:
    # Recreate shipment_message_logs if needed
    op.create_table(
        "shipment_message_logs",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("shipment_id", sa.UUID(), nullable=False),
        sa.Column("message_type", sa.String(), nullable=True),
        sa.Column("message_content", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["shipment_id"], ["shipments.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
    
    # Recreate shipment_reviews_archive if needed
    op.create_table(
        "shipment_reviews_archive",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("shipment_id", sa.UUID(), nullable=False),
        sa.Column("rating", sa.String(), nullable=True),
        sa.Column("review_content", sa.Text(), nullable=True),
        sa.Column("archived_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["shipment_id"], ["shipments.id"], ),
        sa.PrimaryKeyConstraint("id"),
    )
