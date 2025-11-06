from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from models import get_db, Category, Todo, TodoDependency, OneOffTodo
from schemas import (
    DependencyGraph,
    DependencyNode,
    DependencyEdge,
    CategoryResponse,
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
