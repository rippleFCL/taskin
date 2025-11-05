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
    reset_interval: int = 1
    reset_count: int = 0


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


# Dependency graph schemas
class DependencyNode(BaseModel):
    """A node in the dependency graph representing a todo or category"""

    id: int
    title: str
    category: Optional[str] = None  # Only for todo nodes
    status: Optional[TaskStatus] = None  # Only for todo nodes
    reset_interval: Optional[int] = None  # Only for todo nodes
    node_type: str = "todo"  # "todo" or "category"


class DependencyEdge(BaseModel):
    """An edge in the dependency graph representing a dependency relationship"""

    from_todo_id: int
    from_todo_title: str
    to_todo_id: Optional[int] = None
    to_todo_title: Optional[str] = None
    depends_on_all_oneoffs: bool = False
    dependency_type: str  # "todo", "category", or "all_oneoffs"


class DependencyGraph(BaseModel):
    """Complete dependency graph with nodes and edges"""

    nodes: List[DependencyNode]
    edges: List[DependencyEdge]
    categories: List[CategoryResponse]
    oneoff_count: int
