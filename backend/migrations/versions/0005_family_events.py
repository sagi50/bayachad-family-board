"""Add shared family calendar events."""
from alembic import op
import sqlalchemy as sa

revision = '0005'
down_revision = '0004'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'family_events',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('title', sa.String(160), nullable=False),
        sa.Column('topic', sa.String(80), nullable=False, server_default=''),
        sa.Column('person', sa.String(12), nullable=False),
        sa.Column('location', sa.String(160), nullable=False, server_default=''),
        sa.Column('event_date', sa.String(10), nullable=False),
        sa.Column('event_time', sa.String(5), nullable=False, server_default=''),
        sa.Column('updated_at', sa.String(32), nullable=False),
        sa.Column('updated_by', sa.String(80), nullable=False),
        sa.Column('updated_user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.CheckConstraint("person IN ('sagi', 'maya', 'alma', 'liam')", name='ck_family_event_person'),
    )
    op.create_index('ix_family_events_event_date', 'family_events', ['event_date'])


def downgrade():
    op.drop_index('ix_family_events_event_date', table_name='family_events')
    op.drop_table('family_events')
