from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import OneOffTodoDependency, TaskStatus, get_db, Category, Todo, TodoDependency, OneOffTodo
from schemas import (
    DependencyGraph,
    DependencyNode,
    DependencyEdge,
    NodeType,
)





router = APIRouter()


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
    oneoffs = db.query(OneOffTodo).filter(OneOffTodo.status != TaskStatus.complete).all()

    todo_map: dict[int, Todo] = {todo.id: todo for todo in todos}

    nodes: list[DependencyNode] = []
    edges: list[DependencyEdge] = []

    nid = 0

    oneoff_id_map: dict[int, int] = {}
    todo_id_map: dict[int, int] = {}
    category_id_map: dict[int, int] = {}

    for todo in todos:
        nodes.append(
            DependencyNode(
                id=nid,
                title=todo.title,
                node_type=NodeType.todo,
            )
        )
        todo_id_map[todo.id] = nid
        nid += 1
    for category in categories:
        nodes.append(
            DependencyNode(
                id=nid,
                title=category.name,
                node_type=NodeType.category,
            )
        )
        category_id_map[category.id] = nid
        nid += 1
    for oneoff in oneoffs:
        nodes.append(
            DependencyNode(
                id=nid,
                title=oneoff.title,
                node_type=NodeType.oneoff,
            )
        )
        oneoff_id_map[oneoff.id] = nid
        nid += 1

    one_off_cat_nid = nid
    nodes.append(
        DependencyNode(
            id=one_off_cat_nid,
            title="All One-Off Todos",
            node_type=NodeType.category,
        )
    )

    start_node_nid = nid + 1
    end_node_nid = nid + 2

    nodes.append(
        DependencyNode(
            id=start_node_nid,
            title="Wake up",
            node_type=NodeType.control,
        )
    )
    nodes.append(
        DependencyNode(
            id=end_node_nid,
            title="Go to sleep",
            node_type=NodeType.control,
        )
    )

    for todo in todos:
        downstream_deps = db.query(TodoDependency).filter(TodoDependency.depends_on_todo_id == todo.id).all()
        has_category_sub_dep = False # if another todo depends on the current todo
        upstream_deps_count = db.query(TodoDependency).filter(TodoDependency.todo_id == todo.id).count()
        depends_on_all_oneoffs = db.query(TodoDependency).filter(TodoDependency.todo_id == todo.id, TodoDependency.depends_on_all_oneoffs == 1).count() > 0
        if depends_on_all_oneoffs:
            edges.append(
                DependencyEdge(
                    from_node_id=one_off_cat_nid,
                    to_node_id=todo_id_map[todo.id],
                )
            )
        if upstream_deps_count == 0:
            # Connect to start node
            edges.append(
                DependencyEdge(
                    from_node_id=start_node_nid,
                    to_node_id=todo_id_map[todo.id],
                )
            )
        for dep in downstream_deps:
            if dep.depends_on_all_oneoffs:
                edges.append(
                    DependencyEdge(
                        from_node_id=todo_id_map[todo.id],
                        to_node_id=one_off_cat_nid,
                    )
                )
            if dep.depends_on_todo_id is not None:
                edges.append(
                    DependencyEdge(
                        from_node_id=todo_id_map[todo.id],
                        to_node_id=todo_id_map[dep.todo_id],
                    )
                )
                # Check if this dependency is a sub-dependency via category
                dep_todo = todo_map.get(dep.todo_id)
                if dep_todo and dep_todo.category_id == todo.category_id and todo.category_id is not None:
                    has_category_sub_dep = True

        if not has_category_sub_dep and todo.category_id is not None:
            # Connect to the category node
            edges.append(
                DependencyEdge(
                    from_node_id=todo_id_map[todo.id],
                    to_node_id=category_id_map[todo.category_id],
                )
            )
    for category in categories:
        downstream_deps = db.query(TodoDependency).filter(TodoDependency.depends_on_category_id == category.id).all()
        if len(downstream_deps) == 0:
            edges.append(
                DependencyEdge(
                    from_node_id=category_id_map[category.id],
                    to_node_id=end_node_nid,
                )
            )
        for dep in downstream_deps:
            edges.append(
                DependencyEdge(
                    from_node_id=category_id_map[category.id],
                    to_node_id=todo_id_map[dep.todo_id],
                )
            )

    if len(oneoffs) == 0:
        # Connect all one-off todos control node to end node directly
        edges.append(
            DependencyEdge(
                from_node_id=start_node_nid,
                to_node_id=one_off_cat_nid,
            )
        )
    downstream_deps = db.query(TodoDependency).filter(TodoDependency.depends_on_all_oneoffs == 1).count()
    if downstream_deps == 0:
        edges.append(
            DependencyEdge(
                from_node_id=one_off_cat_nid,
                to_node_id=end_node_nid,
            )
        )
    for oneoff in oneoffs:
        upstream_deps = db.query(OneOffTodoDependency).all()
        if len(upstream_deps) == 0:
            edges.append(
                DependencyEdge(
                    from_node_id=start_node_nid,
                    to_node_id=oneoff_id_map[oneoff.id],
                )
            )
        for dep in upstream_deps:
            if dep.depends_on_todo_id is not None:
                edges.append(
                    DependencyEdge(
                        from_node_id=todo_id_map[dep.depends_on_todo_id],
                        to_node_id=oneoff_id_map[oneoff.id],
                    )
                )
            if dep.depends_on_category_id is not None:
                edges.append(
                    DependencyEdge(
                        from_node_id=category_id_map[dep.depends_on_category_id],
                        to_node_id=oneoff_id_map[oneoff.id],
                    )
                )
        edges.append(
            DependencyEdge(
                from_node_id=oneoff_id_map[oneoff.id],
                to_node_id=one_off_cat_nid,
            )
        )

    return DependencyGraph(
        nodes=nodes,
        edges=edges,
    )
