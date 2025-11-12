from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from models import (
    Event,
    OneOffTodo,
    get_db,
    Todo,
    TaskStatus,
)
from schemas import Timeslot, TodoResponse, TodoWithCategory
from dep_manager import dep_man
from config_loader import TimeDependency

router = APIRouter()

@router.get("/timeslots", response_model=dict[int, Timeslot])
def get_timeslots(db: Session = Depends(get_db)):
    """Get the timeslots for todos with time dependencies"""
    events = db.query(Event).all()
    todo_timeslots = dep_man.get_timeslots(events)
    return todo_timeslots

@router.get("/todos", response_model=list[TodoWithCategory])
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
    if status == TaskStatus.incomplete:
        db_todo.reset_count = 0 # Reset the reset_count when marking incomplete
    db_todo.status = status
    db.commit()
    db.refresh(db_todo)
    return db_todo

def in_timeslot(time_dependency: TimeDependency, current_seconds: float) -> bool:
    """Check if the current time in seconds is within the time dependency slot."""
    if time_dependency.start is not None:
        if current_seconds < time_dependency.start:
            return False
    if time_dependency.end is not None:
        if current_seconds > time_dependency.end:
            return False
    return True

@router.get("/recommended-todos", response_model=list[TodoWithCategory])
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
    current_time = datetime.now()
    seconds_into_day = (current_time - current_time.replace(hour=0, minute=0, second=0, microsecond=0)).total_seconds()

    blocking_todo_ids = set()
    for todo in incomplete_todos:
        time_dep = dep_man.time_dep_map[todo.id]
        if not in_timeslot(time_dep, seconds_into_day):
            continue
        time_deps = dep_man.event_dep_map.get(todo.id, {})
        for event_name, tdep in time_deps.items():
            event = db.query(Event).filter(Event.name == event_name).first()
            if event:
                seconds_since_event = (current_time - event.timestamp).total_seconds()
                if not in_timeslot(tdep, seconds_since_event):
                    break
        else:
            blocking_todo_ids.add(todo.id)


    # Check if there are any incomplete oneoffs
    has_incomplete_oneoffs = db.query(OneOffTodo).filter(OneOffTodo.status != TaskStatus.complete).count() > 0

    recommended = []
    ddm = dep_man.full_graph.ddm

    for todo in incomplete_todos:
        # Get all dependencies for this todo from the DDM
        all_deps = ddm.get_deps(todo.id)

        # Check if any of the dependencies are still incomplete
        incomplete_deps = all_deps & blocking_todo_ids

        if incomplete_deps or todo.id not in blocking_todo_ids:
            # Has incomplete dependencies, not ready
            continue

        # Check if this todo depends on oneoffs
        if dep_man.ONEOFF_START_ID in all_deps:
            # This todo has oneoffs as a dependency
            if has_incomplete_oneoffs:
                # Oneoffs not complete yet
                continue
        time_dep = dep_man.time_dep_map[todo.id]

        # All dependencies satisfied!
        recommended.append(todo)

    return recommended
