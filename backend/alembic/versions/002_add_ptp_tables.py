"""add_ptp_tables

Revision ID: 002_add_ptp_tables
Revises: 771ac4e61c55
Create Date: 2026-01-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '002_add_ptp_tables'
down_revision: Union[str, None] = '771ac4e61c55'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create races, race_aid_stations, and admin_settings tables"""

    # Create races table
    op.create_table(
        'races',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('slug', sa.String(length=100), nullable=False),
        sa.Column('gpx_content', sa.Text(), nullable=False),
        sa.Column('total_distance_km', sa.Float(), nullable=True),
        sa.Column('total_elevation_gain', sa.Integer(), nullable=True),
        sa.Column('total_elevation_loss', sa.Integer(), nullable=True),
        sa.Column('start_location_lat', sa.Float(), nullable=True),
        sa.Column('start_location_lon', sa.Float(), nullable=True),
        sa.Column('is_published', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_races_slug', 'races', ['slug'], unique=True)
    op.create_index('ix_races_is_published', 'races', ['is_published'])

    # Create race_aid_stations table
    op.create_table(
        'race_aid_stations',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('race_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('distance_km', sa.Float(), nullable=False),
        sa.Column('elevation', sa.Integer(), nullable=True),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('services', postgresql.ARRAY(sa.String()), nullable=True),
        sa.Column('cutoff_time', sa.String(length=10), nullable=True),
        sa.Column('position_order', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['race_id'], ['races.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_race_aid_stations_race_id', 'race_aid_stations', ['race_id'])

    # Create admin_settings table
    op.create_table(
        'admin_settings',
        sa.Column('key', sa.String(length=100), nullable=False),
        sa.Column('value', sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint('key')
    )


def downgrade() -> None:
    """Drop races, race_aid_stations, and admin_settings tables"""
    op.drop_table('admin_settings')
    op.drop_index('ix_race_aid_stations_race_id', table_name='race_aid_stations')
    op.drop_table('race_aid_stations')
    op.drop_index('ix_races_is_published', table_name='races')
    op.drop_index('ix_races_slug', table_name='races')
    op.drop_table('races')
