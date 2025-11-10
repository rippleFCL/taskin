from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from models import (
    OneOffTodo,
    get_db,
    Todo,
    TaskStatus,
)
from schemas import TodoResponse, TodoWithCategory
from dep_manager import dep_man

router = APIRouter()


@router.get("/todos", response_model=List[TodoWithCategory])
def get_todos(status: TaskStatus | None = None, category_id: int | None = None, db: Session = Depends(get_db)):
    """Get all todos with optional filtering by status and category"""
    query = db.query(Todo)

    if status:
        query = query.filter(Todo.status == status)
    if category_id:
        query = query.filter(Todo.category_id == category_id)

    todos = query.all()
    return todos


@router.get("/todos/{todo_id}", response_model=TodoWithCategory)
def get_todo(todo_id: int, db: Session = Depends(get_db)):
    """Get a specific todo"""
    todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if not todo:
        raise HTTPException(status_code=404, detail="Todo not found")
    return todo


@router.patch("/todos/{todo_id}/status", response_model=TodoResponse)
def update_todo_status(todo_id: int, status: TaskStatus, db: Session = Depends(get_db)):
    """Update only the status of a todo"""
    db_todo = db.query(Todo).filter(Todo.id == todo_id).first()
    if not db_todo:
        raise HTTPException(status_code=404, detail="Todo not found")

    old_status = db_todo.status

    # Track status transitions for statistics
    if status == TaskStatus.in_progress and old_status != TaskStatus.in_progress:
        # Entering in-progress state - record the start time
        db_todo.in_progress_start = datetime.now()
    elif old_status == TaskStatus.in_progress and status != TaskStatus.in_progress:
        # Leaving in-progress state - accumulate the duration
        if db_todo.in_progress_start is not None:
            duration = (datetime.now() - db_todo.in_progress_start).total_seconds()
            db_todo.cumulative_in_progress_seconds += duration
            db_todo.in_progress_start = None

    db_todo.status = status
    db.commit()
    db.refresh(db_todo)
    return db_todo


@router.get("/recommended-todos", response_model=List[TodoWithCategory])
def get_recommended_todos(db: Session = Depends(get_db)):
    """
    Get todos that are ready to work on (all dependencies satisfied).
    A todo is recommended if:
    - It's not already complete or skipped
    - All of its dependencies (from the DDM) are complete or skipped

    This uses the Deep Dependency Map (DDM) which provides O(1) lookup of all
    dependencies for each todo, including:
    - All explicit dependencies
    - Recursive walk up the dependency tree
    - Expanded category dependencies
    """
    # Get all incomplete and in-progress todos (exclude complete and skipped)
    incomplete_todos = db.query(Todo).filter(Todo.status.in_([TaskStatus.incomplete, TaskStatus.in_progress])).all()

    # Get incomplete/in-progress todo IDs (these are blocking)
    blocking_todo_ids = {todo.id for todo in incomplete_todos}

    # Check if there are any incomplete oneoffs
    has_incomplete_oneoffs = db.query(OneOffTodo).filter(OneOffTodo.status != TaskStatus.complete).count() > 0

    recommended = []
    ddm = dep_man.full_graph.ddm

    for todo in incomplete_todos:
        # Get all dependencies for this todo from the DDM
        all_deps = ddm.get_deps(todo.id)

        # Check if any of the dependencies are still incomplete
        incomplete_deps = all_deps & blocking_todo_ids

        if incomplete_deps:
            # Has incomplete dependencies, not ready
            continue

        # Check if this todo depends on oneoffs
        if dep_man.ONEOFF_START_ID in all_deps:
            # This todo has oneoffs as a dependency
            if has_incomplete_oneoffs:
                # Oneoffs not complete yet
                continue

        # All dependencies satisfied!
        recommended.append(todo)

    return recommended
