from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime
from models import (
    get_db,
    Todo,
    TaskStatus,
    Report,
    TaskReport,
)

router = APIRouter()


@router.post("/reset")
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
    total_todos = 0
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

            if todo.status == TaskStatus.complete:
                compleated_todos += 1
                final_status = TaskStatus.complete
            elif todo.status == TaskStatus.skipped:
                skipped_todos += 1
                final_status = TaskStatus.skipped
            else:
                incomplete_todos += 1
                final_status = TaskStatus.incomplete

            # Create task report
            task_report = TaskReport(
                report_id=report.id,
                todo_id=todo.id,
                todo_title=todo.title,
                category_name=todo.category.name if todo.category else "Unknown",
                final_status=final_status,
                in_progress_duration_seconds=in_progress_duration,
            )
            db.add(task_report)

        # Track counts for the report

        # Skipped todos ALWAYS reset to incomplete
        if todo.status == TaskStatus.skipped:
            todo.status = TaskStatus.incomplete
            todo.reset_count = 0

        elif todo.status == TaskStatus.in_progress:
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

        if todo.status == TaskStatus.incomplete:
            total_todos += 1

        todo.in_progress_start = None
        todo.cumulative_in_progress_seconds = 0.0

    report.completed_todos = compleated_todos
    report.skipped_todos = skipped_todos
    report.incomplete_todos = incomplete_todos

    db.commit()

    return {
        "total": len(todos),
        "report_id": report.id,
        "total_tasks": total_todos,
    }
