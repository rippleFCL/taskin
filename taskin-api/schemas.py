from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
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
    position: int = 0
    cumulative_in_progress_seconds: float = 0

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

class NodeType(Enum):
    todo = "todo"
    category = "category"
    oneoff = "oneoff"
    control = "control"

# Dependency graph schemas
class DependencyNode(BaseModel):
    """A node in the dependency graph representing a todo or category"""

    id: int
    title: str
    node_type: NodeType


class DependencyEdge(BaseModel):
    """An edge in the dependency graph representing a dependency relationship"""

    from_node_id: int
    to_node_id: int


class DependencyGraph(BaseModel):
    """Complete dependency graph with nodes and edges"""

    nodes: List[DependencyNode]
    edges: List[DependencyEdge]


# Statistics/Report schemas
class TaskReportResponse(ORMModel):
    """Schema for individual task report in a reset cycle"""

    id: int
    todo_id: int
    todo_title: str
    category_name: str
    final_status: TaskStatus
    in_progress_duration_seconds: Optional[float]


class ResetReportResponse(ORMModel):
    """Schema for reset report summary"""

    id: int
    created_at: datetime
    total_todos: int
    completed_todos: int
    skipped_todos: int
    incomplete_todos: int
    task_reports: List[TaskReportResponse] = Field(default_factory=list)


class TaskStatistics(BaseModel):
    """Aggregated statistics for a specific task across multiple reports"""

    todo_id: int
    todo_title: str
    category_name: str

    # Metrics
    completion_rate: float  # Percentage of reports where task was completed (0-100)
    skip_rate: float  # Percentage of reports where task was skipped (0-100)
    avg_in_progress_duration_seconds: Optional[float]  # Average time spent in-progress when it was used

    # Raw counts
    total_appearances: int
    times_completed: int
    times_skipped: int
    times_incomplete: int

    tot_in_progress_duration_seconds: float  # Total time spent in-progress across all reports


class AggregatedStatistics(BaseModel):
    """Overall aggregated statistics across all tasks and reports"""

    report_count: int  # Number of reports analyzed
    task_statistics: List[TaskStatistics]  # Per-task breakdown
