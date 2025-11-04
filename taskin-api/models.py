import os
from sqlalchemy import create_engine, Column, Integer, String, Enum as SQLEnum, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
import enum

Base = declarative_base()
environment = os.environ.get("ENV", "prod").lower()


class TaskStatus(enum.Enum):
    """Enum for task status"""

    incomplete = "incomplete"
    in_progress = "in-progress"
    complete = "complete"


class Category(Base):
    """Category model for organizing todos"""

    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False, index=True)
    description = Column(String, nullable=True)

    # Relationship to todos
    todos = relationship("Todo", back_populates="category", cascade="all, delete-orphan")


class Todo(Base):
    """Todo model with category and status"""

    __tablename__ = "todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.incomplete, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)

    # Relationship to category
    category = relationship("Category", back_populates="todos")


class TodoDependency(Base):
    """Dependency relationships between todos, categories, and one-offs"""

    __tablename__ = "todo_dependencies"

    id = Column(Integer, primary_key=True, index=True)
    todo_id = Column(Integer, ForeignKey("todos.id", ondelete="CASCADE"), nullable=False)

    # Either depends on a specific todo, a whole category, or all one-offs being complete
    depends_on_todo_id = Column(Integer, ForeignKey("todos.id", ondelete="CASCADE"), nullable=True)
    depends_on_category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=True)
    depends_on_all_oneoffs = Column(Integer, default=0, nullable=False)  # 1=true, 0=false


class OneOffTodo(Base):
    """A simple one-off todo with only a title and description.

    These are intended to be ephemeral. When "completed", the item is deleted.
    """

    __tablename__ = "oneoff_todos"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=True)
    status = Column(SQLEnum(TaskStatus), default=TaskStatus.incomplete, nullable=False)


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
