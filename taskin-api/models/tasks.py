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


class TCategory(SQLModel):
    id: UUID | None = None
    name: str
    tasks: list["TTask"] | None = None

class CategoryBase(SQLModel):
    id: UUID | None = None
    name: str

class CategoryFull(CategoryBase):
    tasks: list["TaskBase"] | None = None



class Task(SQLModel, table=True):
    id: UUID = Field(default_factory=uuid4, primary_key=True, index=True)
    name: str = Field(index=True)
    status: StatusEnum = Field(default=StatusEnum.todo, index=True)
    category_id: UUID | None = Field(default=None, foreign_key="category.id", nullable=True)
    category: Category = Relationship(back_populates="tasks")

class TaskBase(SQLModel):
    id: UUID
    name: str
    status: StatusEnum
    category_id: UUID | None = None

class TaskFull(TaskBase):
    category: CategoryBase | None = None

class TTask(SQLModel):
    id: UUID | None
    name: str
    status: StatusEnum
    category_id: UUID | None = None
    category: TCategory | None = None
