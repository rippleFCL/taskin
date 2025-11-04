from urllib.parse import urljoin
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from models import get_db, Category, Todo, TodoDependency, TaskStatus, OneOffTodo
import json
from urllib import request as urlrequest
from urllib.error import URLError, HTTPError
from schemas import (
    CategoryWithTodos,
    TodoResponse,
    TodoWithCategory,
    OneOffTodoResponse,
    OneOffTodoCreate,
    OneOffTodoUpdate,
)
from config_loader import UI_URI, WEBHOOK_URL

router = APIRouter()


# Category endpoints
@router.get("/categories", response_model=List[CategoryWithTodos])
def get_categories(db: Session = Depends(get_db)):
    """Get all categories with their todos"""
    categories = db.query(Category).all()
    return categories


@router.get("/categories/{category_id}", response_model=CategoryWithTodos)
def get_category(category_id: int, db: Session = Depends(get_db)):
    """Get a specific category with its todos"""
    category = db.query(Category).filter(Category.id == category_id).first()
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return category


# Todo endpoints
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

    setattr(db_todo, "status", status)
    db.commit()
    db.refresh(db_todo)
    return db_todo


@router.get("/recommended-todos", response_model=List[TodoWithCategory])
def get_recommended_todos(db: Session = Depends(get_db)):
    """
    Get todos that are ready to work on (all dependencies satisfied).
    A todo is recommended if:
    - It's not already complete
    - All todo dependencies are complete
    - All category dependencies have all their todos complete
    """
    # Get all incomplete todos
    incomplete_todos = db.query(Todo).filter(Todo.status != TaskStatus.complete).all()

    recommended = []

    for todo in incomplete_todos:
        # Get all dependencies for this todo
        dependencies = db.query(TodoDependency).filter(TodoDependency.todo_id == todo.id).all()

        if not dependencies:
            # No dependencies means it's always recommended (if incomplete)
            recommended.append(todo)
            continue

        # Check if all dependencies are satisfied
        all_satisfied = True

        for dep in dependencies:
            if dep.depends_on_todo_id is not None:
                # Check if the dependent todo is complete
                dep_todo = db.query(Todo).filter(Todo.id == dep.depends_on_todo_id).first()
                if not dep_todo:
                    all_satisfied = False
                    break
                # Type ignore for SQLAlchemy enum comparison
                if dep_todo.status != TaskStatus.complete:  # type: ignore
                    all_satisfied = False
                    break

            elif dep.depends_on_category_id is not None:
                # Check if ALL todos in the dependent category are complete
                category_todos = db.query(Todo).filter(Todo.category_id == dep.depends_on_category_id).all()

                if not category_todos:
                    all_satisfied = False
                    break

                # Check each todo in category
                for t in category_todos:
                    if t.status != TaskStatus.complete:  # type: ignore
                        all_satisfied = False
                        break

                if not all_satisfied:
                    break

            elif getattr(dep, "depends_on_all_oneoffs", 0) == 1:
                # Check if ALL one-off todos are complete
                oneoffs = db.query(OneOffTodo).all()
                if not oneoffs:
                    # No one-offs exist, dependency satisfied
                    pass
                else:
                    for oneoff in oneoffs:
                        if oneoff.status != TaskStatus.complete:  # type: ignore
                            all_satisfied = False
                            break
                    if not all_satisfied:
                        break

        if all_satisfied:
            recommended.append(todo)

    return recommended


@router.post("/todos/reset")
def reset_all_todos(db: Session = Depends(get_db)):
    """Reset all todos to incomplete status"""
    todos = db.query(Todo).all()
    count = 0

    for todo in todos:
        todo.status = TaskStatus.incomplete  # type: ignore
        count += 1

    db.commit()
    return {"message": f"Reset {count} todo(s) to incomplete status", "count": count}


# One-off todo endpoints
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


def _post_webhook(url: str, body: dict):
    try:
        data = json.dumps(body).encode("utf-8")
        req = urlrequest.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
        with urlrequest.urlopen(req, timeout=5):
            pass
    except (HTTPError, URLError, TimeoutError, Exception):
        # Swallow errors to avoid impacting API response
        pass


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
            background_tasks.add_task(_post_webhook, WEBHOOK_URL, {"title": item.title, "url": urljoin(UI_URI, "/oneoff")})
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
        setattr(item, "title", payload.title)
    if payload.description is not None:
        setattr(item, "description", payload.description)
    if payload.status is not None:
        setattr(item, "status", payload.status)
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
    setattr(item, "status", status)
    db.commit()
    db.refresh(item)
    return item
