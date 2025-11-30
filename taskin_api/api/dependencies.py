from datetime import datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from models import Event, TaskStatus, get_db, Category, Todo, OneOffTodo
from schemas import (
    DependencyGraph,
    DependencyNode,
    DependencyEdge,
    NodeType,
    RGBColor,
)
from dep_manager import dep_man
from config_loader import TimeDependency


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
    seconds_into_day = (
        current_time - current_time.replace(hour=0, minute=0, second=0, microsecond=0)
    ).total_seconds()

    filter_time_dep_ids: set[int] = set()
    # Add todo nodes
    for todo in todos:
        if todo.id not in graph.nodes:
            continue  # Skip todos not in the graph (e.g., completed todos)

        time_dep = dep_man.time_dep_map[todo.id]
        within_time_window = True
        time_dep = dep_man.time_dep_map[todo.id]
        if not in_timeslot(time_dep, seconds_into_day):
            within_time_window = False
        time_deps = dep_man.event_dep_map.get(todo.id, {})
        for event_name, tdep in time_deps.items():
            event = db.query(Event).filter(Event.name == event_name).first()
            if event:
                seconds_since_event = (current_time - event.timestamp).total_seconds()
                if not in_timeslot(tdep, seconds_since_event):
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
    one_off_cat_nid = nid
    start_node_nid = nid + 1
    end_node_nid = nid + 2
    oneoff_start_nid = nid + 3

    nodes.append(
        DependencyNode(
            id=one_off_cat_nid,
            title="All One-Off Todos",
            node_type=NodeType.category,
        )
    )
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

    for tid, node in graph.nodes.items():
        if tid == dep_man.ONEOFF_START_ID:
            continue  # Handled separately
        if not (node.cat_dependencies or node.dependencies):
            # No dependencies, connect to start
            edges.append(
                DependencyEdge(
                    from_node_id=start_node_nid,
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
            edges.append(
                DependencyEdge(
                    from_node_id=category_id_map[cat_id],
                    to_node_id=end_node_nid,
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
            edges.append(
                DependencyEdge(
                    from_node_id=start_node_nid,
                    to_node_id=target_nid,
                )
            )

        # Check if anything depends on oneoffs
        oneoff_category = graph.categories.get(dep_man.ONEOFF_END_ID)
        if oneoff_category and not oneoff_category.dependants:
            edges.append(
                DependencyEdge(
                    from_node_id=one_off_cat_nid,
                    to_node_id=end_node_nid,
                )
            )

    return DependencyGraph(
        nodes=nodes,
        edges=edges,
        node_category_map=nid_categories,
    )
