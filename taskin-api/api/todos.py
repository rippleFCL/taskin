from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from models import (
    get_db,
    Todo,
    TaskStatus,
    TodoDependencyComputed,
    Report,
    TaskReport,
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
        dependencies = db.query(TodoDependencyComputed).filter(TodoDependencyComputed.todo_id == todo.id).all()

        if not dependencies:
            # No dependencies means it's always recommended (if incomplete)
            recommended.append(todo)
            continue

        # Check if all dependencies are satisfied (complete or skipped)
        all_satisfied = True

        for dep in dependencies:
            # All computed dependencies are todo->todo
            dep_todo = db.query(Todo).filter(Todo.id == dep.depends_on_todo_id).first()
            if not dep_todo or dep_todo.status not in [TaskStatus.complete, TaskStatus.skipped]:  # type: ignore
                all_satisfied = False
                break

        if all_satisfied:
            recommended.append(todo)

    return recommended


@router.post("/todos/reset")
def reset_all_todos(db: Session = Depends(get_db)):
    """
    Reset todos to incomplete status based on their reset_interval.
    - Skipped todos ALWAYS reset (reset_interval ignored)
    - Complete todos increment reset_count and reset when count % interval == 0

    Generates a ResetReport with per-task statistics including in-progress duration.

    Example:
    - reset_interval=1: resets every time (daily)
    - reset_interval=5: resets every 5 calls (every 5 days)
    - skipped status: always resets regardless of interval
    """
    todos = db.query(Todo).all()


    # Create the reset report
    report = Report(
        created_at=datetime.now(),
        total_todos=len(todos),
        completed_todos=0,
        skipped_todos=0,
        incomplete_todos=0,
    )
    db.add(report)
    db.flush()  # Get the report ID

    compleated_todos = 0
    skipped_todos = 0
    incomplete_todos = 0

    # Process each todo and create task reports
    for todo in todos:
        if todo.reset_count == 0:
            # Calculate in-progress duration (cumulative + current session if still in progress)
            in_progress_duration = todo.cumulative_in_progress_seconds
            if todo.status == TaskStatus.in_progress and todo.in_progress_start is not None:
                # Still in progress, add current session duration
                current_session = (datetime.now() - todo.in_progress_start).total_seconds()
                in_progress_duration += current_session

            # Use None if no time was spent in progress
            if in_progress_duration == 0:
                in_progress_duration = None

            # Create task report
            task_report = TaskReport(
                report_id=report.id,
                todo_id=todo.id,
                todo_title=todo.title,
                category_name=todo.category.name if todo.category else "Unknown",
                final_status=todo.status,
                in_progress_duration_seconds=in_progress_duration,
            )
            
            db.add(task_report)
            if todo.status == TaskStatus.complete:
                compleated_todos += 1
            elif todo.status == TaskStatus.skipped:
                skipped_todos += 1
            else:
                incomplete_todos += 1
        # Track counts for the report

        # Skipped todos ALWAYS reset to incomplete
        if todo.status == TaskStatus.skipped:
            todo.status = TaskStatus.incomplete
            todo.reset_count = 0

        # Complete todos reset based on interval
        elif todo.status == TaskStatus.complete:
            current_count = todo.reset_count + 1
            interval = todo.reset_interval

            # Increment the reset counter
            todo.reset_count = current_count  # type: ignore

            # Check if it's time to reset this todo
            if current_count % interval == 0:
                # Time to reset this todo
                todo.status = TaskStatus.incomplete
                todo.reset_count = 0


        todo.in_progress_start = None
        todo.cumulative_in_progress_seconds = 0.0

    report.completed_todos = compleated_todos
    report.skipped_todos = skipped_todos
    report.incomplete_todos = incomplete_todos

    db.commit()

    return {
        "total": len(todos),
        "report_id": report.id,
    }
