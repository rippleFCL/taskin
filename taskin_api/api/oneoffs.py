import json
from urllib import request as urlrequest
from urllib.error import HTTPError, URLError

from config_loader import WEBHOOK_URL
from dep_manager import dep_man
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from models import OneOffTodo, TaskStatus, Todo, get_db
from schemas import OneOffTodoCreate, OneOffTodoResponse, OneOffTodoUpdate
from sqlalchemy.orm import Session

router = APIRouter()


def _post_webhook(url: str, body: dict):
    """Helper function to post webhook notifications"""
    try:
        data = json.dumps(body).encode("utf-8")
        req = urlrequest.Request(
            url, data=data, headers={"Content-Type": "application/json"}, method="POST"
        )
        with urlrequest.urlopen(req, timeout=5):
            pass
    except (HTTPError, URLError, TimeoutError, Exception):
        # Swallow errors to avoid impacting API response
        pass


@router.get("/oneoff-todos", response_model=list[OneOffTodoResponse])
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
def update_oneoff_todo(
    oneoff_id: int, payload: OneOffTodoUpdate, db: Session = Depends(get_db)
):
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
def update_oneoff_status(
    oneoff_id: int, status: TaskStatus, db: Session = Depends(get_db)
):
    """Update the status of a one-off todo. Completed items persist (no auto-delete)."""
    item = db.query(OneOffTodo).filter(OneOffTodo.id == oneoff_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="One-off todo not found")
    item.status = status
    db.commit()
    db.refresh(item)
    return item


@router.get("/recommended-oneoffs", response_model=list[OneOffTodoResponse])
def get_recommended_oneoff_todos(db: Session = Depends(get_db)):
    """Get recommended one-off todos using the DDM for efficient dependency lookup."""
    # Get all incomplete/in-progress todo IDs (these are blocking)
    incomplete_todo_ids = {
        todo.id
        for todo in db.query(Todo)
        .filter(Todo.status.not_in([TaskStatus.complete, TaskStatus.skipped]))
        .all()
    }

    # Use the DDM to get all dependencies for oneoffs
    ddm = dep_man.full_graph.ddm
    oneoff_deps = ddm.get_deps(dep_man.ONEOFF_START_ID)

    # Check if any of the oneoff dependencies are still incomplete
    if oneoff_deps & incomplete_todo_ids:
        # Oneoffs have incomplete dependencies, not ready yet
        return []

    # Otherwise, recommend all incomplete one-off todos
    return db.query(OneOffTodo).filter(OneOffTodo.status != TaskStatus.complete).all()
