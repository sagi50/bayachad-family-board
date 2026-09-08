"""Add optional location to tasks."""
from alembic import op
import sqlalchemy as sa
revision = '0002'
down_revision = '0001'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('tasks', sa.Column('location', sa.String(160), nullable=False, server_default=''))

def downgrade():
    op.drop_column('tasks', 'location')
