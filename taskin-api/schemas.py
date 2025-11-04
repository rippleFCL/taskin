from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from models import TaskStatus


class ORMModel(BaseModel):
    """Base model enabling Pydantic v2 ORM serialization."""

    model_config = ConfigDict(from_attributes=True)


class CategoryResponse(ORMModel):
    """Schema for category response"""

    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    id: int


class TodoResponse(ORMModel):
    """Schema for todo response"""

    id: int
    title: str
    description: Optional[str]
    status: TaskStatus
    category_id: int


class CategoryWithTodos(CategoryResponse):
    """Schema for category with todos"""

    todos: List[TodoResponse] = Field(default_factory=list)


class TodoWithCategory(TodoResponse):
    """Schema for todo with category details"""

    category: CategoryResponse


# One-off todos
class OneOffTodoBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None


class OneOffTodoCreate(OneOffTodoBase):
    pass


class OneOffTodoUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None


class OneOffTodoResponse(ORMModel):
    id: int
    title: str
    description: Optional[str]
    status: TaskStatus
