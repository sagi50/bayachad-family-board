from datetime import date
from typing import Literal
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator

class LoginInput(BaseModel):
    username: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=1, max_length=128)

class TaskInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra='ignore')
    title: str = Field(min_length=1, max_length=160)
    details: str = Field(default='', max_length=10000)
    topic: str = Field(default='', max_length=80)
    location: str = Field(default='', max_length=160)
    for_child: Literal['family', 'sagi', 'maya', 'alma', 'liam'] = 'family'
    due: str = Field(default='', max_length=10)
    assignee: Literal['together', 'husband', 'wife'] = 'together'
    status: Literal['active', 'future', 'done'] = 'active'

    @field_validator('due')
    @classmethod
    def valid_date(cls, value):
        if value and (len(value) != 10 or date.fromisoformat(value).isoformat() != value):
            raise ValueError('Invalid date')
        return value

class TaskEdit(TaskInput):
    id: UUID
    version: int = Field(ge=1)

class TaskReference(BaseModel):
    id: UUID
    version: int = Field(ge=1)
