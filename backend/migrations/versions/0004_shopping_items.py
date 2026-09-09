"""Add shared shopping list items."""
from alembic import op
import sqlalchemy as sa

revision = '0004'
down_revision = '0003'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table(
        'shopping_items',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('name', sa.String(160), nullable=False),
        sa.Column('quantity', sa.String(80), nullable=False, server_default='1'),
        sa.Column('notes', sa.String(500), nullable=False, server_default=''),
        sa.Column('status', sa.String(10), nullable=False, server_default='now'),
        sa.Column('updated_at', sa.String(32), nullable=False),
        sa.Column('updated_by', sa.String(80), nullable=False),
        sa.Column('updated_user_id', sa.String(36), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('version', sa.Integer(), nullable=False, server_default='1'),
        sa.CheckConstraint("status IN ('now', 'future', 'done')", name='ck_shopping_status'),
    )

def downgrade():
    op.drop_table('shopping_items')
