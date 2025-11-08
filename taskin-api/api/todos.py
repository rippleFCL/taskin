from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from models import (
    OneOffTodo,
    TodoDependency,
    get_db,
    Todo,
    TaskStatus,
    TodoDependencyComputed,
)
from schemas import TodoResponse, TodoWithCategory

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
    - All of its computed dependencies (from TodoDependencyComputed) are complete or skipped

    This uses the fully expanded dependency table which includes:
    - All explicit dependencies
    - All implicit position-based dependencies
    - Recursive walk up the dependency tree
    - Expanded category dependencies
    """
    # Get all incomplete and in-progress todos (exclude complete and skipped)
    incomplete_todos = db.query(Todo).filter(Todo.status.in_([TaskStatus.incomplete, TaskStatus.in_progress])).all()

    recommended = []

    for todo in incomplete_todos:
        # Get ALL computed dependencies for this todo

        dependencies = (
            db.query(TodoDependencyComputed)
            .join(Todo, Todo.id == TodoDependencyComputed.depends_on_todo_id)
            .filter(Todo.status.not_in([TaskStatus.complete, TaskStatus.skipped]), TodoDependencyComputed.todo_id == todo.id)
            .distinct()
        )
        exp_deps = (
            db.query(TodoDependencyComputed)
            .join(TodoDependency, TodoDependency.todo_id == TodoDependencyComputed.depends_on_todo_id)
            .filter(TodoDependency.depends_on_all_oneoffs == 1, TodoDependencyComputed.todo_id == todo.id)
            .distinct()
        )


        if exp_deps.count() > 0:
            if db.query(OneOffTodo).filter(OneOffTodo.status != TaskStatus.complete).count() != 0:
                continue

        if dependencies.count() == 0:
            # No dependencies means it's always recommended (if incomplete)
            recommended.append(todo)

    return recommended
