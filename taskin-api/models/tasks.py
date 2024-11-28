from enum import Enum
from unicodedata import category
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Relationship


class StatusEnum(str, Enum):
    todo = "todo"
    comp = "comp"
    in_prog = "in_prog"


class Category(SQLModel, table=True):
    id: UUID | None = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(index=True)

    tasks: list["Task"] = Relationship(back_populates="category")

class CategorySet(SQLModel):
    name: str

class CategoryResponse(SQLModel):
    name: str


class Task(SQLModel, table=True):
    id: UUID | None = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(index=True)
    status: StatusEnum = Field(default=StatusEnum.todo, index=True)
    category_id: UUID = Field(default=None, foreign_key="category.id")
    category: Category = Relationship(back_populates="tasks")

class TaskSet(SQLModel):
    name: str
    status: StatusEnum
    category_id: UUID

class TaskResponse(SQLModel):
    name: str
    status: StatusEnum
    category: CategoryResponse
