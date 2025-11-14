from enum import Enum
from pydantic import BaseModel, Field, ConfigDict
from typing import Literal
from datetime import datetime
from models import TaskStatus


class ORMModel(BaseModel):
    """Base model enabling Pydantic v2 ORM serialization."""

    model_config = ConfigDict(from_attributes=True)


class CategoryResponse(ORMModel):
    """Schema for category response"""

    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    id: int

class Timeslot(BaseModel):
    """Schema for time dependency, both None if timeslot is impossible"""

    start: datetime | None
    end: datetime | None

class EventResponse(ORMModel):
    """Schema for event response"""

    name: str
    timestamp: datetime

class TodoResponse(ORMModel):
    """Schema for todo response"""

    id: int
    title: str
    description: str | None
    status: TaskStatus
    category_id: int
    in_progress_start: datetime | None = None
    reset_interval: int = 1
    reset_count: int = 0
    position: int = 0
    cumulative_in_progress_seconds: float = 0

class CategoryWithTodos(CategoryResponse):
    """Schema for category with todos"""

    todos: list[TodoResponse] = Field(default_factory=list)


class TodoWithCategory(TodoResponse):
    """Schema for todo with category details"""

    category: CategoryResponse


# One-off todos
class OneOffTodoBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: str | None = None


class OneOffTodoCreate(OneOffTodoBase):
    pass


class OneOffTodoUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = None
    status: TaskStatus | None = None


class OneOffTodoResponse(ORMModel):
    id: int
    title: str
    description: str | None
    status: TaskStatus


class NodeType(Enum):
    todo = "todo"
    category = "category"
    oneoff = "oneoff"
    control = "control"

class RGBColor(BaseModel):
    """RGB color representation"""

    r: int = Field(..., ge=0, le=255)
    g: int = Field(..., ge=0, le=255)
    b: int = Field(..., ge=0, le=255)

# Dependency graph schemas
class DependencyNode(BaseModel):
    """A node in the dependency graph representing a todo or category"""

    id: int
    title: str
    node_type: NodeType
    boarder_color: RGBColor | None = None


class DependencyEdge(BaseModel):
    """An edge in the dependency graph representing a dependency relationship"""

    from_node_id: int
    to_node_id: int


class DependencyGraph(BaseModel):
    """Complete dependency graph with nodes and edges"""

    nodes: list[DependencyNode]
    edges: list[DependencyEdge]
    node_category_map: dict[int, str | Literal["Uncategorised"]]


# Statistics/Report schemas
class TaskReportResponse(ORMModel):
    """Schema for individual task report in a reset cycle"""

    id: int
    todo_id: int
    todo_title: str
    category_name: str
    final_status: TaskStatus
    in_progress_duration_seconds: float | None


class ResetReportResponse(ORMModel):
    """Schema for reset report summary"""

    id: int
    created_at: datetime
    total_todos: int
    completed_todos: int
    skipped_todos: int
    incomplete_todos: int
    task_reports: list[TaskReportResponse] = Field(default_factory=list)


class TaskStatistics(BaseModel):
    """Aggregated statistics for a specific task across multiple reports"""

    todo_id: int
    todo_title: str
    category_name: str

    # Metrics
    completion_rate: float  # Percentage of reports where task was completed (0-100)
    skip_rate: float  # Percentage of reports where task was skipped (0-100)
    avg_in_progress_duration_seconds: float | None  # Average time spent in-progress when it was used

    # Raw counts
    total_appearances: int
    times_completed: int
    times_skipped: int
    times_incomplete: int

    tot_in_progress_duration_seconds: float  # Total time spent in-progress across all reports


class AggregatedStatistics(BaseModel):
    """Overall aggregated statistics across all tasks and reports"""

    report_count: int  # Number of reports analyzed
    task_statistics: list[TaskStatistics]  # Per-task breakdown
    total_completions: int
    total_skips: int
    total_incompletes: int
