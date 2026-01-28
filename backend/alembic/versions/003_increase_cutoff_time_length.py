"""Increase cutoff_time column length

Revision ID: 003_cutoff_length
Revises: 002_add_ptp_tables
Create Date: 2026-01-28 16:10:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '003_cutoff_length'
down_revision = '002_add_ptp_tables'
branch_labels = None
depends_on = None


def upgrade():
    # Increase cutoff_time from VARCHAR(10) to VARCHAR(50)
    # to support longer formats like "Wed 08:45 PM"
    op.alter_column(
        'race_aid_stations',
        'cutoff_time',
        existing_type=sa.String(length=10),
        type_=sa.String(length=50),
        existing_nullable=True
    )


def downgrade():
    op.alter_column(
        'race_aid_stations',
        'cutoff_time',
        existing_type=sa.String(length=50),
        type_=sa.String(length=10),
        existing_nullable=True
    )
