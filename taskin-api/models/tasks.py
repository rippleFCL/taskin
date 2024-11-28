from enum import Enum
from uuid import UUID, uuid4

from sqlmodel import Field, SQLModel, Relationship


class StatusEnum(str, Enum):
    todo = "todo"
    comp = "comp"
    in_prog = "in_prog"


class Category(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    name: str = Field(index=True)

    tasks: list["Task"] = Relationship(back_populates="category")


class Task(SQLModel, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    name: str = Field(index=True)
    status: StatusEnum = Field(default=StatusEnum.todo, index=True)
    category_id: int | None = Field(default=None, foreign_key="category.id")
    category: Category = Relationship(back_populates="tasks")
