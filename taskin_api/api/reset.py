from operator import le
from fastapi import APIRouter, Depends
import requests
from sqlalchemy.orm import Session
from datetime import datetime
from models import (
    get_db,
    Todo,
    TaskStatus,
    Report,
    TaskReport,
)
from config_loader import CONFIG
router = APIRouter()


def generate_aggregated_avg_comp_rate(reports: list[Report]) -> float:
    """Helper to calculate average completion rate across reports"""
    if not reports:
        return 0.0
    total_rate = 0.0
    for report in reports:
        if report.total_todos > 0:
            total_rate += report.completed_todos / report.total_todos
    return total_rate / len(reports)


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
        total_todos=len([todo for todo in todos if todo.reset_count == 0]),
        completed_todos=0,
        skipped_todos=0,
        incomplete_todos=0,
    )
    db.add(report)
    db.flush()  # Get the report ID
    total_todos = 0
    completed_todos = 0
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
                completed_todos += 1
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

    report.completed_todos = completed_todos
    report.skipped_todos = skipped_todos
    report.incomplete_todos = incomplete_todos

    db.commit()

    reports = (
        db.query(Report)
        .order_by(Report.created_at.desc())
        .limit(30+1).all()
    )
    if CONFIG.warning:
        daily_config = CONFIG.warning.daily
        weekly_config = CONFIG.warning.weekly
        last_week_avg_comp_rate = generate_aggregated_avg_comp_rate(reports[:7])*100
        if last_week_avg_comp_rate < weekly_config.critical.threshold:
            requests.post(str(weekly_config.webhook_url), json={
                "message" : weekly_config.critical.message,
                "average_completion_rate": f"{last_week_avg_comp_rate:.2f}%",
                "color": "15548997"
            }, timeout=5)
        elif last_week_avg_comp_rate < weekly_config.warning.threshold:
            requests.post(str(weekly_config.webhook_url), json={
                "message" : weekly_config.warning.message,
                "average_completion_rate": f"{last_week_avg_comp_rate:.2f}%",
                "color": "15105570"
            }, timeout=5)
        else:
            requests.post(str(weekly_config.webhook_url), json={
                "message" : weekly_config.info_message,
                "average_completion_rate": f"{last_week_avg_comp_rate:.2f}%",
                "color": "5763719"
            }, timeout=5)
        if len(reports) >= 2:
            last_month_avg_comp_rate = generate_aggregated_avg_comp_rate(reports[1:])*100
            today_avg_comp_rate = generate_aggregated_avg_comp_rate(reports[:1])*100
            if last_month_avg_comp_rate != 0:
                percentage_change = (today_avg_comp_rate / last_month_avg_comp_rate - 1) * 100
            else:
                percentage_change = 0

            if percentage_change < daily_config.critical.threshold:
                requests.post(str(daily_config.webhook_url), json={
                    "message" : daily_config.critical.message,
                    "today_completion_rate": f"{today_avg_comp_rate:.2f}%",
                    "percentage_change": f"{percentage_change:.2f}%",
                    "month_avg_completion_rate": f"{last_month_avg_comp_rate:.2f}%",
                    "color": "15548997"

                }, timeout=5)
            elif percentage_change < daily_config.warning.threshold:
                requests.post(str(daily_config.webhook_url), json={
                    "message" : daily_config.warning.message,
                    "today_completion_rate": f"{today_avg_comp_rate:.2f}%",
                    "percentage_change": f"{percentage_change:.2f}%",
                    "month_avg_completion_rate": f"{last_month_avg_comp_rate:.2f}%",
                    "color": "15105570"
                }, timeout=5)
            else:
                requests.post(str(daily_config.webhook_url), json={
                    "message" : daily_config.info_message,
                    "today_completion_rate": f"{today_avg_comp_rate:.2f}%",
                    "percentage_change": f"{percentage_change:.2f}%",
                    "month_avg_completion_rate": f"{last_month_avg_comp_rate:.2f}%",
                    "color": "5763719"
                }, timeout=5)




    return {
        "total": len(todos),
        "report_id": report.id,
        "total_tasks": total_todos,
    }
