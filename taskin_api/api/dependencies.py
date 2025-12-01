from datetime import datetime

from config_loader import TimeDependency
from dep_manager import dep_man
from fastapi import APIRouter, Depends, Query
from models import Category, Event, OneOffTodo, TaskStatus, Todo, get_db
from schemas import (
    DependencyEdge,
    DependencyGraph,
    DependencyNode,
    NodeType,
    RGBColor,
)
from sqlalchemy.orm import Session

router = APIRouter()


def in_timeslot(time_dependency: TimeDependency, current_seconds: float) -> bool:
    """Check if the current time in seconds is within the time dependency slot."""
    if time_dependency.start is not None:
        if current_seconds < time_dependency.start:
            return False
    if time_dependency.end is not None:
        if current_seconds > time_dependency.end:
            return False
    return True


@router.get("/dependency-graph", response_model=DependencyGraph)
def get_dependency_graph(
    db: Session = Depends(get_db),
    graph_type: str = Query("scoped", enum=["full", "scoped"]),
    filter_time_deps: bool = Query(False),
):
    """
    Get the complete dependency graph showing relationships between all todos.
    Returns nodes (todos and categories) and edges (dependency relationships).
    Uses the Graph structure from dependencies.py which is pre-calculated.
    """
    # Get all todos and categories
    todos = db.query(Todo).all()
    categories = db.query(Category).all()
    oneoffs = (
        db.query(OneOffTodo).filter(OneOffTodo.status != TaskStatus.complete).all()
    )
    if graph_type == "scoped":
        unready_todos = db.query(Todo.id).filter(Todo.reset_count > 0).all()
        unready_ids = {tid for (tid,) in unready_todos}
        graph = dep_man.scope_subgraph(unready_ids)
    else:
        graph = dep_man.full_graph

    nodes: list[DependencyNode] = []
    edges: list[DependencyEdge] = []
    nid_categories: dict[int, str] = {}

    nid = 0

    oneoff_id_map: dict[int, int] = {}
    todo_id_map: dict[int, int] = {}
    category_id_map: dict[int, int] = {}
    current_time = datetime.now()

    filter_time_dep_ids: set[int] = set()
    # Add todo nodes
    for todo in todos:
        if todo.id not in graph.nodes:
            continue  # Skip todos not in the graph (e.g., completed todos)

        # Use computed timeslots from dependency manager
        within_time_window = True
        ts_map = dep_man.get_timeslots(db.query(Event).all())
        ts = ts_map.get(todo.id)
        if ts:
            if ts.start and current_time < ts.start:
                within_time_window = False
            if ts.end and current_time > ts.end:
                within_time_window = False

        if (
            filter_time_deps
            and not within_time_window
            and todo.status not in (TaskStatus.complete, TaskStatus.skipped)
        ):
            filter_time_dep_ids.add(todo.id)
            continue
        if todo.status == TaskStatus.complete:
            color = RGBColor(r=0, g=204, b=102)  # Green for completed
        elif todo.status == TaskStatus.in_progress:
            # blue for in-progress
            color = RGBColor(r=51, g=102, b=204)
        elif todo.status == TaskStatus.skipped:
            color = RGBColor(r=204, g=102, b=51)  # Orange for skipped
        elif not within_time_window:
            color = RGBColor(r=255, g=255, b=51)  # Yellow for out-of-time-window
        else:
            color = None
        nodes.append(
            DependencyNode(
                id=nid, title=todo.title, node_type=NodeType.todo, boarder_color=color
            )
        )
        nid_categories[nid] = todo.category.name if todo.category else "Uncategorised"
        todo_id_map[todo.id] = nid
        nid += 1

    if filter_time_deps:
        graph = graph.filter_out(filter_time_dep_ids)

    # Add category nodes
    for category in categories:
        if category.id not in graph.categories:
            continue  # Skip categories not in the graph
        nodes.append(
            DependencyNode(
                id=nid,
                title=category.name,
                node_type=NodeType.category,
            )
        )
        category_id_map[category.id] = nid
        nid += 1

    # Add oneoff nodes
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

    # Control nodes
    start_nid_name = "Wake up"
    end_nid_name = "Go to sleep"
    one_off_cat_nid = nid
    oneoff_start_nid = nid + 3

    nodes.append(
        DependencyNode(
            id=one_off_cat_nid,
            title="All One-Off Todos",
            node_type=NodeType.category,
        )
    )

    for tid, node in graph.nodes.items():
        if tid == dep_man.ONEOFF_START_ID:
            continue  # Handled separately
        if not (node.cat_dependencies or node.dependencies):
            # No dependencies, connect to start
            nid += 1
            nodes.append(
                DependencyNode(
                    id=nid,
                    title=start_nid_name,
                    node_type=NodeType.control,
                )
            )
            edges.append(
                DependencyEdge(
                    from_node_id=nid,
                    to_node_id=todo_id_map[tid],
                )
            )
        for dep_tid in node.dependencies:
            if dep_tid in todo_id_map:
                edges.append(
                    DependencyEdge(
                        from_node_id=todo_id_map[dep_tid],
                        to_node_id=todo_id_map[tid],
                    )
                )
            else:
                print(f"Warning: Todo dependency id {dep_tid} not found in todo_id_map")
        for cat_dep in node.cat_dependencies:
            if cat_dep == dep_man.ONEOFF_END_ID:
                edges.append(
                    DependencyEdge(
                        from_node_id=one_off_cat_nid,
                        to_node_id=todo_id_map[tid],
                    )
                )
                continue
            if cat_dep in category_id_map:
                edges.append(
                    DependencyEdge(
                        from_node_id=category_id_map[cat_dep],
                        to_node_id=todo_id_map[tid],
                    )
                )
            else:
                print(
                    f"Warning: Category dependency id {cat_dep} not found in category_id_map"
                )
    for cat_id, cat_node in graph.categories.items():
        if not cat_node.dependants and cat_id in category_id_map:
            # No dependants, connect to end
            nid += 1
            nodes.append(
                DependencyNode(
                    id=nid,
                    title=end_nid_name,
                    node_type=NodeType.control,
                )
            )
            edges.append(
                DependencyEdge(
                    from_node_id=category_id_map[cat_id],
                    to_node_id=nid,
                )
            )
        for dep_cat_id in cat_node.dependencies:
            if dep_cat_id == dep_man.ONEOFF_START_ID:
                continue  # Oneoff handled separately
            if dep_cat_id in todo_id_map and cat_id in category_id_map:
                edges.append(
                    DependencyEdge(
                        from_node_id=todo_id_map[dep_cat_id],
                        to_node_id=category_id_map[cat_id],
                    )
                )
            else:
                print(
                    f"Warning: Category dependency todo id {dep_cat_id} not found in category_id_map"
                )

    # Handle oneoff dependencies
    oneoff_node = graph.nodes.get(dep_man.ONEOFF_START_ID)
    if oneoff_node:
        has_oneoff_deps = bool(oneoff_node.dependencies or oneoff_node.cat_dependencies)
        target_nid = one_off_cat_nid
        if len(oneoffs) > 0:
            nodes.append(
                DependencyNode(
                    id=oneoff_start_nid,
                    title="One-Off Todos Start",
                    node_type=NodeType.control,
                )
            )
            target_nid = oneoff_start_nid

            # Connect individual oneoffs
            for oneoff in oneoffs:
                edges.append(
                    DependencyEdge(
                        from_node_id=oneoff_start_nid,
                        to_node_id=oneoff_id_map[oneoff.id],
                    )
                )
                edges.append(
                    DependencyEdge(
                        from_node_id=oneoff_id_map[oneoff.id],
                        to_node_id=one_off_cat_nid,
                    )
                )
        if has_oneoff_deps:
            # Connect oneoff dependencies
            for dep_tid in oneoff_node.dependencies:
                if dep_tid in todo_id_map:
                    edges.append(
                        DependencyEdge(
                            from_node_id=todo_id_map[dep_tid],
                            to_node_id=target_nid,
                        )
                    )
            for cat_dep in oneoff_node.cat_dependencies:
                if cat_dep in category_id_map:
                    edges.append(
                        DependencyEdge(
                            from_node_id=category_id_map[cat_dep],
                            to_node_id=target_nid,
                        )
                    )
        else:
            # No dependencies, connect to start
            nid += 1
            nodes.append(
                DependencyNode(
                    id=nid,
                    title=start_nid_name,
                    node_type=NodeType.control,
                )
            )
            edges.append(
                DependencyEdge(
                    from_node_id=nid,
                    to_node_id=target_nid,
                )
            )

        # Check if anything depends on oneoffs
        oneoff_category = graph.categories.get(dep_man.ONEOFF_END_ID)
        if oneoff_category and not oneoff_category.dependants:
            # No dependants, connect to end
            nid += 1
            nodes.append(
                DependencyNode(
                    id=nid,
                    title=end_nid_name,
                    node_type=NodeType.control,
                )
            )
            edges.append(
                DependencyEdge(
                    from_node_id=one_off_cat_nid,
                    to_node_id=nid,
                )
            )

    return DependencyGraph(
        nodes=nodes,
        edges=edges,
        node_category_map=nid_categories,
    )
