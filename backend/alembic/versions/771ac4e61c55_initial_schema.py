"""initial_schema

Revision ID: 771ac4e61c55
Revises:
Create Date: 2025-11-08 16:32:46.076702

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '771ac4e61c55'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create shared_states table"""
    op.create_table(
        'shared_states',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('share_id', sa.String(length=12), nullable=False),
        sa.Column('state_json', postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('view_count', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('last_accessed_at', sa.DateTime(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.Text(), nullable=True),
        sa.Column('file_size_bytes', sa.Integer(), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )

    # Create indexes
    op.create_index('ix_shared_states_id', 'shared_states', ['id'])
    op.create_index('ix_shared_states_share_id', 'shared_states', ['share_id'], unique=True)
    op.create_index('ix_shared_states_created_at', 'shared_states', ['created_at'])
    op.create_index('ix_shared_states_expires_at', 'shared_states', ['expires_at'])


def downgrade() -> None:
    """Drop shared_states table"""
    op.drop_index('ix_shared_states_expires_at', table_name='shared_states')
    op.drop_index('ix_shared_states_created_at', table_name='shared_states')
    op.drop_index('ix_shared_states_share_id', table_name='shared_states')
    op.drop_index('ix_shared_states_id', table_name='shared_states')
    op.drop_table('shared_states')
