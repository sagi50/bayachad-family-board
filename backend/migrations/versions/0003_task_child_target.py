"""Add optional child target to tasks."""
from alembic import op
import sqlalchemy as sa
revision = '0003'
down_revision = '0002'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('tasks', sa.Column('for_child', sa.String(12), nullable=False, server_default='family'))

def downgrade():
    op.drop_column('tasks', 'for_child')
