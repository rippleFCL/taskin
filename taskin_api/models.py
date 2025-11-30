from __future__ import annotations

import enum
import os
from datetime import datetime, timezone

from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    create_engine,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.orm import (
    DeclarativeBase,
    Mapped,
    mapped_column,
    relationship,
    sessionmaker,
)


class Base(DeclarativeBase):
    pass


environment = os.environ.get("ENV", "prod").lower()


class TaskStatus(enum.Enum):
    """Enum for task status"""

    incomplete = "incomplete"
    in_progress = "in-progress"
    complete = "complete"
    skipped = "skipped"  # Like complete but always resets next day


class Category(Base):
    """Category model for organizing todos"""

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)

    # Relationship to todos
    todos: Mapped[list["Todo"]] = relationship(
        back_populates="category", cascade="all, delete-orphan"
    )


class Todo(Base):
    """Todo model with category and status"""

    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(TaskStatus), default=TaskStatus.incomplete, nullable=False
    )
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id"), nullable=False
    )
    reset_interval: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    reset_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    position: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False
    )  # Position within category for implicit deps

    # Status transition tracking for statistics
    in_progress_start: Mapped[datetime | None] = mapped_column(
        DateTime, nullable=True
    )  # When task entered in-progress
    cumulative_in_progress_seconds: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False
    )  # Total time spent in-progress (cumulative across multiple sessions)

    # Relationship to category
    category: Mapped["Category"] = relationship(back_populates="todos")


class Event(Base):
    """Event model for logging significant actions"""

    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now()
    )


class OneOffTodo(Base):
    """A simple one-off todo with only a title and description.

    These are intended to be ephemeral. When "completed", the item is deleted.
    """

    __tablename__ = "oneoff_todos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(
        SAEnum(TaskStatus), default=TaskStatus.incomplete, nullable=False
    )


class Report(Base):
    """Report generated each time the reset endpoint is called.

    Stores aggregate information about the reset cycle.
    """

    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, default=datetime.now(tz=timezone.utc)
    )
    total_todos: Mapped[int] = mapped_column(Integer, nullable=False)
    completed_todos: Mapped[int] = mapped_column(Integer, nullable=False)
    skipped_todos: Mapped[int] = mapped_column(Integer, nullable=False)
    incomplete_todos: Mapped[int] = mapped_column(Integer, nullable=False)

    # Relationship to task reports
    task_reports: Mapped[list["TaskReport"]] = relationship(
        back_populates="report", cascade="all, delete-orphan"
    )


class TaskReport(Base):
    """Per-task statistics for each reset cycle.

    Records what happened to each task during a reset cycle (since the previous reset).
    """

    __tablename__ = "task_reports"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    report_id: Mapped[int] = mapped_column(
        ForeignKey("reports.id", ondelete="CASCADE"), nullable=False
    )
    todo_id: Mapped[int] = mapped_column(
        Integer, nullable=False
    )  # Not a FK because todo might be deleted
    todo_title: Mapped[str] = mapped_column(String, nullable=False)
    category_name: Mapped[str] = mapped_column(String, nullable=False)

    # Status at time of reset
    final_status: Mapped[TaskStatus] = mapped_column(SAEnum(TaskStatus), nullable=False)

    # Duration in seconds that the task was in-progress during this cycle (None if never entered in-progress)
    in_progress_duration_seconds: Mapped[float | None] = mapped_column(
        Float, nullable=True
    )

    # Relationship to reset report
    report: Mapped["Report"] = relationship(back_populates="task_reports")


# Database setup
# Use correct SQLite URL formats:
# - Relative path: sqlite:///./file.db
# - Absolute path: sqlite:////abs/path/file.db
if environment == "dev":
    SQLALCHEMY_DATABASE_URL = "sqlite:///./taskin.db"
else:
    SQLALCHEMY_DATABASE_URL = "sqlite:////app/data/taskin.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database tables"""
    Base.metadata.create_all(bind=engine)
