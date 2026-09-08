from sqlalchemy import BigInteger, CheckConstraint, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column
from .database import Base

class User(Base):
    __tablename__ = 'users'
    __table_args__ = (CheckConstraint("slot IN ('husband', 'wife')", name='ck_user_slot'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    username: Mapped[str] = mapped_column(String(80), unique=True)
    display_name: Mapped[str] = mapped_column(String(80))
    slot: Mapped[str] = mapped_column(String(12), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[int] = mapped_column(BigInteger, default=0)

class LoginSession(Base):
    __tablename__ = 'sessions'
    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[str] = mapped_column(ForeignKey('users.id', ondelete='CASCADE'), index=True)
    expires_at: Mapped[int] = mapped_column(BigInteger, index=True)

class Task(Base):
    __tablename__ = 'tasks'
    __table_args__ = (CheckConstraint("status IN ('active', 'future', 'done')", name='ck_task_status'),
                      CheckConstraint("assignee IN ('together', 'husband', 'wife')", name='ck_task_assignee'))
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    details: Mapped[str] = mapped_column(Text)
    topic: Mapped[str] = mapped_column(String(80))
    due: Mapped[str] = mapped_column(String(10))
    assignee: Mapped[str] = mapped_column(String(12))
    status: Mapped[str] = mapped_column(String(10))
    updated_at: Mapped[str] = mapped_column(String(32))
    updated_by: Mapped[str] = mapped_column(String(80))
    updated_user_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    version: Mapped[int] = mapped_column(Integer, default=1)
