"""Refactor shipment reviews to customer reviews based on webhook payload.

Revision ID: 20260602_120000
Revises: c1648fd6e0e0
Create Date: 2026-06-02 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "20260602_120000"
down_revision: Union[str, None] = "231ba5259721"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Step 1: Create customer_reviews table with new schema
    op.create_table(
        "customer_reviews",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("store_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("merchant_id", sa.String(), nullable=True),
        sa.Column("customer_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("customer_name", sa.String(), nullable=True),
        sa.Column("customer_mobile", sa.String(), nullable=True),
        sa.Column("recovered_cart_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("order_id", sa.String(), nullable=True),
        sa.Column("order_reference_id", sa.String(), nullable=True),
        sa.Column("product_id", sa.String(), nullable=True),
        sa.Column("review_type", sa.String(), nullable=False, server_default="rating"),
        sa.Column("rating", sa.String(), nullable=True),
        sa.Column("review_content", sa.Text(), nullable=True),
        sa.Column("raw_payload", postgresql.JSON(), nullable=True),
        sa.Column(
            "reviewed_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["customer_id"],
            ["customers.id"],
        ),
        sa.ForeignKeyConstraint(
            ["recovered_cart_id"],
            ["recovered_carts.id"],
        ),
        sa.ForeignKeyConstraint(
            ["store_id"],
            ["stores.id"],
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for optimal query performance
    op.create_index("ix_customer_reviews_store_id", "customer_reviews", ["store_id"])
    op.create_index("ix_customer_reviews_customer_id", "customer_reviews", ["customer_id"])
    op.create_index("ix_customer_reviews_recovered_cart_id", "customer_reviews", ["recovered_cart_id"])
    op.create_index("ix_customer_reviews_order_id", "customer_reviews", ["order_id"])
    op.create_index("ix_customer_reviews_product_id", "customer_reviews", ["product_id"])
    op.create_index("ix_customer_reviews_merchant_id", "customer_reviews", ["merchant_id"])

    # Step 2: Archive old shipment_reviews table by renaming
    op.rename_table("shipment_reviews", "shipment_reviews_archive")

    # Step 3: Drop old constraint from archived table
    op.drop_constraint("uq_shipment_store", "shipment_reviews_archive", type_="unique")

    # Step 4: Add new columns to stores table for review request settings
    op.add_column(
        "stores",
        sa.Column("review_request_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.add_column(
        "stores",
        sa.Column("review_request_delay_hours", sa.Integer(), nullable=False, server_default="24"),
    )
    op.add_column(
        "stores",
        sa.Column("review_request_template_name", sa.String(), nullable=False, server_default="review_request"),
    )

    # Note: Keep old shipment_review_* columns for rollback safety
    # They can be dropped in a future migration after 2-3 weeks of stability


def downgrade() -> None:
    # Reverse the migration
    op.drop_column("stores", "review_request_template_name")
    op.drop_column("stores", "review_request_delay_hours")
    op.drop_column("stores", "review_request_enabled")

    # Restore old table
    op.rename_table("shipment_reviews_archive", "shipment_reviews")
    op.create_unique_constraint(
        "uq_shipment_store",
        "shipment_reviews",
        ["salla_shipment_id", "store_id"],
    )

    # Drop new table
    op.drop_table("customer_reviews")
