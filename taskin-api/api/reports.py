from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from models import datetime, get_db, Report, TaskStatus
from schemas import (
    ResetReportResponse,
    TaskStatistics,
    AggregatedStatistics,
)

router = APIRouter()


@router.get("/reports/{start_date}/{end_date}", response_model=list[ResetReportResponse])
def get_report(start_date: datetime, end_date: datetime, db: Session = Depends(get_db)):
    """Get all reset reports within the date range [start_date, end_date], newest first."""
    reports = (
        db.query(Report)
        .filter(Report.created_at >= start_date, Report.created_at <= end_date)
        .order_by(Report.created_at.desc())
        .all()
    )
    return reports


def generate_aggregated_statistics(reports: List[Report]) -> AggregatedStatistics:
    task_statistics_map: dict[tuple[str, str], TaskStatistics] = {}
    for report in reports:
        for task_report in report.task_reports:
            ts = task_statistics_map.get((task_report.todo_title, task_report.category_name))
            if not ts:
                ts = TaskStatistics(
                    todo_id=task_report.todo_id,
                    todo_title=task_report.todo_title,
                    category_name=task_report.category_name,
                    completion_rate=0.0,
                    skip_rate=0.0,
                    avg_in_progress_duration_seconds=None,
                    times_completed=0,
                    times_skipped=0,
                    tot_in_progress_duration_seconds=0.0,
                    total_appearances=0,
                    times_incomplete=0,
                )
                task_statistics_map[(task_report.todo_title, task_report.category_name)] = ts


            ts.total_appearances += 1
            if task_report.final_status == TaskStatus.complete:
                ts.times_completed += 1
            elif task_report.final_status == TaskStatus.skipped:
                ts.times_skipped += 1
            else:
                ts.times_incomplete += 1
            if task_report.in_progress_duration_seconds is not None:
                ts.tot_in_progress_duration_seconds += task_report.in_progress_duration_seconds

    task_statistics: List[TaskStatistics] = []
    for ts in task_statistics_map.values():
        # Calculate rates
        if ts.total_appearances > 0:
            ts.completion_rate = (ts.times_completed / ts.total_appearances)
            ts.skip_rate = (ts.times_skipped / ts.total_appearances)
            ts.avg_in_progress_duration_seconds = ts.tot_in_progress_duration_seconds / ts.total_appearances
        else:
            ts.completion_rate = 0.0
            ts.skip_rate = 0.0
            ts.avg_in_progress_duration_seconds = None

        task_statistics.append(ts)

    def sort_key(x: TaskStatistics):
        return x.completion_rate

    # Sort by completion rate descending
    task_statistics.sort(key=sort_key, reverse=True)

    return AggregatedStatistics(
        report_count=len(reports),
        task_statistics=task_statistics,
    )


@router.get("/statistics/{start_date}/{end_date}", response_model=AggregatedStatistics)
def get_statistics(start_date: datetime, end_date: datetime, db: Session = Depends(get_db)):
    """
    Get aggregated statistics across the most recent N reports.

    Calculates per-task metrics:
    - Completion rate: % of reports where task was completed
    - Skip rate: % of reports where task was skipped
    - Average in-progress duration: avg time spent in-progress (when used)

    Args:
        report_count: Number of recent reports to analyze (default 10)
    """
    # Get the most recent N reports
    reports = db.query(Report).filter(Report.created_at >= start_date, Report.created_at <= end_date).order_by(Report.created_at.desc()).all()
    return generate_aggregated_statistics(reports)


