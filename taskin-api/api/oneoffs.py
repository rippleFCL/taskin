from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
import json
from urllib import request as urlrequest
from urllib.error import URLError, HTTPError
from models import OneOffTodoDependencyComputed, Todo, get_db, OneOffTodo, TaskStatus
from schemas import OneOffTodoResponse, OneOffTodoCreate, OneOffTodoUpdate
from config_loader import WEBHOOK_URL

router = APIRouter()


def _post_webhook(url: str, body: dict):
    """Helper function to post webhook notifications"""
    try:
        data = json.dumps(body).encode("utf-8")
        req = urlrequest.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
        with urlrequest.urlopen(req, timeout=5):
            pass
    except (HTTPError, URLError, TimeoutError, Exception):
        # Swallow errors to avoid impacting API response
        pass


@router.get("/oneoff-todos", response_model=List[OneOffTodoResponse])
def list_oneoff_todos(db: Session = Depends(get_db)):
    """List all one-off todos."""
    return db.query(OneOffTodo).all()


@router.get("/oneoff-todos/{oneoff_id}", response_model=OneOffTodoResponse)
def get_oneoff_todo(oneoff_id: int, db: Session = Depends(get_db)):
    """Get a single one-off todo by id."""
    item = db.query(OneOffTodo).filter(OneOffTodo.id == oneoff_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="One-off todo not found")
    return item


@router.post("/oneoff-todos", response_model=OneOffTodoResponse, status_code=201)
def create_oneoff_todo(
    payload: OneOffTodoCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Create a new one-off todo."""
    item = OneOffTodo(title=payload.title, description=payload.description)
    db.add(item)
    db.commit()
    db.refresh(item)
    # Fire-and-forget webhook notification if configured
    try:
        if WEBHOOK_URL:
            background_tasks.add_task(_post_webhook, WEBHOOK_URL, {"title": item.title})
    except Exception:
        # Do not block creation on webhook failures
        pass
    return item


@router.patch("/oneoff-todos/{oneoff_id}", response_model=OneOffTodoResponse)
def update_oneoff_todo(oneoff_id: int, payload: OneOffTodoUpdate, db: Session = Depends(get_db)):
    """Update a one-off todo's title, description, and/or status. Completed items persist (no auto-delete)."""
    item = db.query(OneOffTodo).filter(OneOffTodo.id == oneoff_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="One-off todo not found")

    if payload.title is not None:
        item.title = payload.title
    if payload.description is not None:
        item.description = payload.description
    if payload.status is not None:
        item.status = payload.status
    db.commit()
    db.refresh(item)
    return item


@router.delete("/oneoff-todos/{oneoff_id}", status_code=204)
def delete_oneoff_todo(oneoff_id: int, db: Session = Depends(get_db)):
    """Delete (complete) a one-off todo."""
    item = db.query(OneOffTodo).filter(OneOffTodo.id == oneoff_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="One-off todo not found")
    db.delete(item)
    db.commit()
    return None


@router.patch("/oneoff-todos/{oneoff_id}/status", response_model=OneOffTodoResponse)
def update_oneoff_status(oneoff_id: int, status: TaskStatus, db: Session = Depends(get_db)):
    """Update the status of a one-off todo. Completed items persist (no auto-delete)."""
    item = db.query(OneOffTodo).filter(OneOffTodo.id == oneoff_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="One-off todo not found")
    item.status = status
    db.commit()
    db.refresh(item)
    return item


@router.get("/recommended-oneoffs", response_model=List[OneOffTodoResponse])
def get_recommended_oneoff_todos(db: Session = Depends(get_db)):
    """Get recommended one-off todos."""
    # Query all todos that are dependencies for one-off tasks
    dependent_todos = (
        db.query(Todo)
        .join(
            OneOffTodoDependencyComputed,
            OneOffTodoDependencyComputed.depends_on_todo_id == Todo.id,
        )
        .filter(Todo.status.not_in([TaskStatus.complete, TaskStatus.skipped]))
    )
    if dependent_todos.count() > 0:
        return []
    # Otherwise, recommend all incomplete one-off todos
    return db.query(OneOffTodo).filter(OneOffTodo.status == TaskStatus.incomplete).all()
