from urllib.parse import urljoin
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List
from models import get_db, Category, Todo, TodoDependency, TodoDependencyComputed, TaskStatus, OneOffTodo
import json
from urllib import request as urlrequest
from urllib.error import URLError, HTTPError
from schemas import (
    CategoryWithTodos,
    CategoryResponse,
    TodoResponse,
    TodoWithCategory,
    OneOffTodoResponse,
    OneOffTodoCreate,
    OneOffTodoUpdate,
    DependencyGraph,
    DependencyNode,
    DependencyEdge,
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

    # If moving from complete to incomplete, reset the counter
    if db_todo.status == TaskStatus.complete and status == TaskStatus.incomplete:
        db_todo.reset_count = 0

    db_todo.status = status
    db.commit()
    db.refresh(db_todo)
    return db_todo


@router.get("/recommended-todos", response_model=List[TodoWithCategory])
def get_recommended_todos(db: Session = Depends(get_db)):
    """
    Get todos that are ready to work on (all dependencies satisfied).
    A todo is recommended if:
    - It's not already complete
    - All of its computed dependencies (from TodoDependencyComputed) are complete

    This uses the fully expanded dependency table which includes:
    - All explicit dependencies
    - All implicit position-based dependencies
    - Recursive walk up the dependency tree
    - Expanded category dependencies
    """
    # Get all incomplete todos
    incomplete_todos = db.query(Todo).filter(Todo.status != TaskStatus.complete).all()

    recommended = []

    for todo in incomplete_todos:
        # Get ALL computed dependencies for this todo
        dependencies = db.query(TodoDependencyComputed).filter(TodoDependencyComputed.todo_id == todo.id).all()

        if not dependencies:
            # No dependencies means it's always recommended (if incomplete)
            recommended.append(todo)
            continue

        # Check if all dependencies are satisfied
        all_satisfied = True

        for dep in dependencies:
            # All computed dependencies are todo->todo
            dep_todo = db.query(Todo).filter(Todo.id == dep.depends_on_todo_id).first()
            if not dep_todo or dep_todo.status != TaskStatus.complete:  # type: ignore
                all_satisfied = False
                break

        if all_satisfied:
            recommended.append(todo)

    return recommended


@router.post("/todos/reset")
def reset_all_todos(db: Session = Depends(get_db)):
    """
    Reset todos to incomplete status based on their reset_interval.
    Increments reset_count for all todos, and resets status when count % interval == 0.

    Example:
    - reset_interval=1: resets every time (daily)
    - reset_interval=5: resets every 5 calls (every 5 days)
    """
    todos = db.query(Todo).all()
    reset_count = 0
    skipped_count = 0

    for todo in todos:
        # Get current values
        if todo.status == TaskStatus.complete:
            current_count = todo.reset_count + 1
            interval = todo.reset_interval

            # Increment the reset counter
            todo.reset_count = current_count  # type: ignore

            # Check if it's time to reset this todo
            if current_count % interval == 0:
                # Time to reset this todo
                todo.status = TaskStatus.incomplete
                # Reset the counter after resetting status
                todo.reset_count = 0
                reset_count += 1
            else:
                skipped_count += 1

    db.commit()
    return {
        "message": f"Reset {reset_count} todo(s) to incomplete status, {skipped_count} skipped based on interval",
        "reset": reset_count,
        "skipped": skipped_count,
        "total": len(todos),
    }


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


@router.get("/dependency-graph", response_model=DependencyGraph)
def get_dependency_graph(db: Session = Depends(get_db)):
    """
    Get the complete dependency graph showing relationships between all todos.
    Returns nodes (todos and categories) and edges (dependency relationships).
    Category dependencies are now represented as:
    - A category node connected to all todos in that category
    - Dependent todos connect to the category node (not individual todos)
    """
    # Get all todos and categories
    todos = db.query(Todo).all()
    categories = db.query(Category).all()
    oneoff_count = db.query(OneOffTodo).count()

    # Build category lookup
    category_map = {cat.id: cat.name for cat in categories}

    # Build nodes (todos + category nodes)
    nodes = []

    for todo in todos:
        nodes.append(
            DependencyNode(
                id=todo.id,
                title=todo.title,
                category=category_map.get(todo.category_id, "Unknown"),
                status=todo.status,
                reset_interval=todo.reset_interval,
                node_type="todo",
            )
        )

    # Track which categories are actually referenced in dependencies
    referenced_category_ids = set()
    dependencies = db.query(TodoDependency).all()
    for dep in dependencies:
        if dep.depends_on_category_id is not None:
            referenced_category_ids.add(dep.depends_on_category_id)

    # Add category nodes for referenced categories (using negative IDs to avoid conflicts)
    category_node_ids = {}  # maps category_id -> node_id
    for cat_id in referenced_category_ids:
        category_name = category_map.get(cat_id, "Unknown")
        # Use negative ID to distinguish from todo IDs
        node_id = -cat_id
        category_node_ids[cat_id] = node_id
        nodes.append(
            DependencyNode(
                id=node_id,
                title=category_name,
                node_type="category",
            )
        )

    # Add special Wakeup node (ID: -999999)
    WAKEUP_NODE_ID = -999999
    nodes.append(
        DependencyNode(
            id=WAKEUP_NODE_ID,
            title="Wakeup",
            node_type="special",
        )
    )

    # Add special Sleep node (ID: -999998)
    SLEEP_NODE_ID = -999998
    nodes.append(
        DependencyNode(
            id=SLEEP_NODE_ID,
            title="Sleep",
            node_type="special",
        )
    )

    # Build edges (dependencies)
    edges = []

    # Create todo lookup for resolving titles
    todo_map = {t.id: t for t in todos}

    for dep in dependencies:
        from_todo = todo_map.get(dep.todo_id)
        if not from_todo:
            continue

        # Handle todo -> todo dependencies
        if dep.depends_on_todo_id is not None:
            to_todo = todo_map.get(dep.depends_on_todo_id)
            if to_todo:
                edges.append(
                    DependencyEdge(
                        from_todo_id=from_todo.id,
                        from_todo_title=from_todo.title,
                        to_todo_id=to_todo.id,
                        to_todo_title=to_todo.title,
                        dependency_type="todo",
                    )
                )

        # Handle todo -> category dependencies
        elif dep.depends_on_category_id is not None:
            # Dependency on a category:
            # 1. Create edge from dependent todo to category node
            cat_id = dep.depends_on_category_id
            category_node_id = category_node_ids.get(cat_id)
            category_name = category_map.get(cat_id, "Unknown")

            if category_node_id:
                edges.append(
                    DependencyEdge(
                        from_todo_id=from_todo.id,
                        from_todo_title=from_todo.title,
                        to_todo_id=category_node_id,
                        to_todo_title=category_name,
                        dependency_type="category",
                    )
                )

    # Find category nodes that aren't depended upon by any todos
    # Create these category nodes BEFORE we create the category-to-leaf-todo edges
    categories_depended_on = set()
    for dep in dependencies:
        if dep.depends_on_category_id is not None:
            categories_depended_on.add(dep.depends_on_category_id)

    # Check ALL categories that have todos (not just referenced_category_ids)
    all_categories_with_todos = {t.category_id for t in todos}
    for cat_id in all_categories_with_todos:
        if cat_id not in categories_depended_on:
            # This category is not depended upon by any todo
            # Create category node if it doesn't exist yet
            if cat_id not in category_node_ids:
                category_name = category_map.get(cat_id, "Unknown")
                node_id = -cat_id
                category_node_ids[cat_id] = node_id
                nodes.append(
                    DependencyNode(
                        id=node_id,
                        title=category_name,
                        node_type="category",
                    )
                )

    # 2. Create edges from category nodes to leaf todos in that category
    # (leaf = todos that no other todos in the same category depend on)
    # Do this for ALL category nodes, not just referenced_category_ids
    all_category_node_ids = set(category_node_ids.keys())
    for cat_id in all_category_node_ids:
        category_node_id = category_node_ids.get(cat_id)
        if not category_node_id:
            continue
        category_name = category_map.get(cat_id, "Unknown")
        category_todos = [t for t in todos if t.category_id == cat_id]

        # Find which todos in this category are depended on by other todos in the same category
        depended_on_in_category = set()
        for dep in dependencies:
            if dep.depends_on_todo_id is not None:
                from_todo = todo_map.get(dep.todo_id)
                to_todo = todo_map.get(dep.depends_on_todo_id)
                # If both todos are in the same category, mark the dependency target
                if from_todo and to_todo and from_todo.category_id == cat_id and to_todo.category_id == cat_id:
                    depended_on_in_category.add(dep.depends_on_todo_id)

        # Connect only leaf todos (not depended on by others in the same category)
        for target_todo in category_todos:
            if target_todo.id not in depended_on_in_category:
                edges.append(
                    DependencyEdge(
                        from_todo_id=category_node_id,
                        from_todo_title=category_name,
                        to_todo_id=target_todo.id,
                        to_todo_title=target_todo.title,
                        dependency_type="category_member",
                    )
                )

    # Handle all_oneoffs dependencies
    for dep in dependencies:
        from_todo = todo_map.get(dep.todo_id)
        if from_todo and dep.depends_on_all_oneoffs == 1:
            # Dependency on all one-off todos being complete
            edges.append(
                DependencyEdge(
                    from_todo_id=from_todo.id,
                    from_todo_title=from_todo.title,
                    depends_on_all_oneoffs=True,
                    dependency_type="all_oneoffs",
                )
            )

    # Find todos with no dependencies and connect them to Wakeup node
    todos_with_deps = {dep.todo_id for dep in dependencies}
    for todo in todos:
        if todo.id not in todos_with_deps:
            # This todo has no dependencies
            edges.append(
                DependencyEdge(
                    from_todo_id=todo.id,
                    from_todo_title=todo.title,
                    to_todo_id=WAKEUP_NODE_ID,
                    to_todo_title="Wakeup",
                    dependency_type="special",
                )
            )

    # Connect Sleep node to category nodes that aren't depended upon
    for cat_id in all_categories_with_todos:
        if cat_id not in categories_depended_on:
            category_node_id = category_node_ids.get(cat_id)
            category_name = category_map.get(cat_id, "Unknown")
            if category_node_id:
                edges.append(
                    DependencyEdge(
                        from_todo_id=SLEEP_NODE_ID,
                        from_todo_title="Sleep",
                        to_todo_id=category_node_id,
                        to_todo_title=f"Category: {category_name}",
                        dependency_type="special",
                    )
                )

    return DependencyGraph(
        nodes=nodes,
        edges=edges,
        categories=[CategoryResponse(id=c.id, name=c.name, description=c.description) for c in categories],
        oneoff_count=oneoff_count,
    )
