from datetime import date, time as time_value, datetime, timezone
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, delete, select, update
from sqlalchemy.orm import Mapped, Session, mapped_column

from .database import Base, get_db
from .models import User
from .security import current_user, require_write

router = APIRouter(prefix='/api/events', tags=['events'])


class FamilyEvent(Base):
    __tablename__ = 'family_events'
    __table_args__ = (
        CheckConstraint("person IN ('sagi', 'maya', 'alma', 'liam')", name='ck_family_event_person'),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    topic: Mapped[str] = mapped_column(String(80), default='')
    person: Mapped[str] = mapped_column(String(12))
    location: Mapped[str] = mapped_column(String(160), default='')
    event_date: Mapped[str] = mapped_column(String(10), index=True)
    event_time: Mapped[str] = mapped_column(String(5), default='')
    updated_at: Mapped[str] = mapped_column(String(32))
    updated_by: Mapped[str] = mapped_column(String(80))
    updated_user_id: Mapped[str] = mapped_column(ForeignKey('users.id'))
    version: Mapped[int] = mapped_column(Integer, default=1)


class EventInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='ignore')
    title: str = Field(min_length=1, max_length=160)
    topic: str = Field(default='', max_length=80)
    person: Literal['sagi', 'maya', 'alma', 'liam']
    location: str = Field(default='', max_length=160)
    event_date: str = Field(min_length=10, max_length=10)
    event_time: str = Field(default='', max_length=5)

    @field_validator('event_date')
    @classmethod
    def valid_date(cls, value: str):
        if date.fromisoformat(value).isoformat() != value:
            raise ValueError('Invalid date')
        return value

    @field_validator('event_time')
    @classmethod
    def valid_time(cls, value: str):
        if value:
            time_value.fromisoformat(value)
            if len(value) != 5:
                raise ValueError('Invalid time')
        return value


class EventEdit(EventInput):
    id: UUID
    version: int = Field(ge=1)


class EventReference(BaseModel):
    id: UUID
    version: int = Field(ge=1)


def serialize_event(event: FamilyEvent):
    return {key: getattr(event, key) for key in (
        'id', 'title', 'topic', 'person', 'location', 'event_date', 'event_time',
        'updated_at', 'updated_by', 'version'
    )}


@router.get('')
def list_events(user: User = Depends(current_user), db: Session = Depends(get_db)):
    rows = db.scalars(select(FamilyEvent).order_by(FamilyEvent.event_date, FamilyEvent.event_time, FamilyEvent.updated_at.desc())).all()
    return {'events': [serialize_event(event) for event in rows], 'user': user.display_name}


@router.post('', status_code=201)
def create_event(body: EventInput, user: User = Depends(require_write), db: Session = Depends(get_db)):
    event = FamilyEvent(
        id=str(uuid4()),
        **body.model_dump(),
        updated_at=datetime.now(timezone.utc).isoformat(timespec='milliseconds'),
        updated_by=user.display_name,
        updated_user_id=user.id,
        version=1,
    )
    db.add(event)
    db.commit()
    return {'ok': True, 'id': event.id}


@router.patch('')
def edit_event(body: EventEdit, user: User = Depends(require_write), db: Session = Depends(get_db)):
    values = body.model_dump(exclude={'id', 'version'})
    values.update(
        updated_at=datetime.now(timezone.utc).isoformat(timespec='milliseconds'),
        updated_by=user.display_name,
        updated_user_id=user.id,
        version=body.version + 1,
    )
    result = db.execute(
        update(FamilyEvent)
        .where(FamilyEvent.id == str(body.id), FamilyEvent.version == body.version)
        .values(**values)
    )
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(409, 'האירוע השתנה או נמחק מאז שפתחתם אותו. פתחו אותו מחדש.')
    db.commit()
    return {'ok': True, 'id': str(body.id)}


@router.delete('')
def delete_event(body: EventReference, user: User = Depends(require_write), db: Session = Depends(get_db)):
    result = db.execute(delete(FamilyEvent).where(FamilyEvent.id == str(body.id), FamilyEvent.version == body.version))
    if result.rowcount != 1:
        db.rollback()
        raise HTTPException(409, 'האירוע השתנה או נמחק מאז שפתחתם אותו. פתחו אותו מחדש.')
    db.commit()
    return {'ok': True}
