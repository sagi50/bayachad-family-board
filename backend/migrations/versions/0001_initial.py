"""Initial two-person board, users and revocable sessions."""
from alembic import op
import sqlalchemy as sa
revision = '0001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('users', sa.Column('id',sa.String(36),primary_key=True), sa.Column('username',sa.String(80),nullable=False,unique=True), sa.Column('display_name',sa.String(80),nullable=False), sa.Column('slot',sa.String(12),nullable=False,unique=True), sa.Column('password_hash',sa.String(255),nullable=False), sa.Column('failed_logins',sa.Integer(),nullable=False), sa.Column('locked_until',sa.BigInteger(),nullable=False), sa.CheckConstraint("slot IN ('husband','wife')",name='ck_user_slot'))
    op.create_table('sessions', sa.Column('token_hash',sa.String(64),primary_key=True), sa.Column('user_id',sa.String(36),sa.ForeignKey('users.id',ondelete='CASCADE'),nullable=False), sa.Column('expires_at',sa.BigInteger(),nullable=False))
    op.create_index('ix_sessions_user_id','sessions',['user_id'])
    op.create_index('ix_sessions_expires_at','sessions',['expires_at'])
    op.create_table('tasks', sa.Column('id',sa.String(36),primary_key=True), sa.Column('title',sa.String(160),nullable=False), sa.Column('details',sa.Text(),nullable=False), sa.Column('topic',sa.String(80),nullable=False), sa.Column('due',sa.String(10),nullable=False), sa.Column('assignee',sa.String(12),nullable=False), sa.Column('status',sa.String(10),nullable=False), sa.Column('updated_at',sa.String(32),nullable=False), sa.Column('updated_by',sa.String(80),nullable=False), sa.Column('updated_user_id',sa.String(36),sa.ForeignKey('users.id'),nullable=False), sa.Column('version',sa.Integer(),nullable=False), sa.CheckConstraint("status IN ('active','future','done')",name='ck_task_status'), sa.CheckConstraint("assignee IN ('together','husband','wife')",name='ck_task_assignee'))

def downgrade():
    raise RuntimeError('Destructive downgrade disabled; restore a verified backup instead.')
