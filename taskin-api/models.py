from __future__ import annotations
import os

import enum
from typing import List, Optional

from sqlalchemy import Enum as SAEnum, ForeignKey, String, create_engine, Integer
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


class Category(Base):
    """Category model for organizing todos"""

    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)

    # Relationship to todos
    todos: Mapped[List["Todo"]] = relationship(back_populates="category", cascade="all, delete-orphan")


class Todo(Base):
    """Todo model with category and status"""

    __tablename__ = "todos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(SAEnum(TaskStatus), default=TaskStatus.incomplete, nullable=False)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), nullable=False)
    reset_interval: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    reset_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)  # Position within category for implicit deps

    # Relationship to category
    category: Mapped["Category"] = relationship(back_populates="todos")


class TodoDependency(Base):
    """Explicit dependency relationships for visualization in the dependency graph.

    Stores dependencies as defined in config:
    - todo -> todo dependencies
    - todo -> category dependencies (not expanded)
    - todo -> all_oneoffs flag

    This table is used ONLY for rendering the dependency graph.
    """

    __tablename__ = "todo_dependencies"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    todo_id: Mapped[int] = mapped_column(ForeignKey("todos.id", ondelete="CASCADE"), nullable=False)

    # Explicit dependency types (only one should be set)
    depends_on_todo_id: Mapped[Optional[int]] = mapped_column(ForeignKey("todos.id", ondelete="CASCADE"), nullable=True)
    depends_on_category_id: Mapped[Optional[int]] = mapped_column(
        ForeignKey("categories.id", ondelete="CASCADE"), nullable=True
    )
    depends_on_all_oneoffs: Mapped[int] = mapped_column(Integer, default=0, nullable=False)


class TodoDependencyComputed(Base):
    """Fully computed/expanded dependencies for determining task readiness.

    This table contains ALL dependencies (explicit + implicit + expanded):
    - All explicit todo->todo dependencies
    - All category dependencies expanded to individual todos
    - All implicit dependencies (position-based within category)
    - Recursive walk up the dependency tree

    This table is used for the recommended todos logic.
    """

    __tablename__ = "todo_dependencies_computed"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    todo_id: Mapped[int] = mapped_column(ForeignKey("todos.id", ondelete="CASCADE"), nullable=False)
    depends_on_todo_id: Mapped[int] = mapped_column(ForeignKey("todos.id", ondelete="CASCADE"), nullable=False)


class OneOffTodo(Base):
    """A simple one-off todo with only a title and description.

    These are intended to be ephemeral. When "completed", the item is deleted.
    """

    __tablename__ = "oneoff_todos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[Optional[str]] = mapped_column(String, nullable=True)
    status: Mapped[TaskStatus] = mapped_column(SAEnum(TaskStatus), default=TaskStatus.incomplete, nullable=False)


# Database setup
# Use correct SQLite URL formats:
# - Relative path: sqlite:///./file.db
# - Absolute path: sqlite:////abs/path/file.db
if environment == "dev":
    SQLALCHEMY_DATABASE_URL = "sqlite:///./taskin.db"
else:
    SQLALCHEMY_DATABASE_URL = "sqlite:////app/data/taskin.db"

engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
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
