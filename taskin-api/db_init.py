from sqlalchemy.orm import Session
from models import Category, Todo, TodoDependency, TodoDependencyComputed, TaskStatus, SessionLocal
from config_loader import CONFIG, AppConfig, CategoryConfig, TodoConfig
from alembic.config import Config
from alembic import command
import os


def sync_db_from_config(db: Session):
    """
    Sync database with config file:
    - Add new categories and todos from config
    - Update existing todos (title, description, category) but preserve status
    - Remove todos not in config (stale)
    - Status is never loaded from config, defaults to incomplete for new todos
    """
    config = CONFIG
    if not config:
        raise ValueError("CONFIG not initialized")

    # Build a map of config data for efficient lookup
    config_categories: dict[str, CategoryConfig] = {}
    config_todos: dict[tuple[str, str], TodoConfig] = {}  # key: (category_name, todo_title)

    for category_data in config.categories:
        category_name = category_data.name
        config_categories[category_name] = category_data

        for todo_data in category_data.todos:
            key = (category_name, todo_data.title)
            config_todos[key] = todo_data

    # Get existing data from database
    existing_categories = {cat.name: cat for cat in db.query(Category).all()}
    existing_todos: dict[tuple[str, str], Todo] = {}  # key: (category_name, todo_title) -> todo object

    for todo in db.query(Todo).all():
        category = db.query(Category).filter(Category.id == todo.category_id).first()
        if category:
            key = (category.name, todo.title)
            existing_todos[key] = todo

    # 1. Sync categories - add new ones, update existing
    category_map = {}  # name -> Category object
    for category_name, category_data in config_categories.items():
        if category_name in existing_categories:
            # Update existing category
            cat = existing_categories[category_name]
            cat.description = category_data.description  # type: ignore
            category_map[category_name] = cat
        else:
            # Create new category
            cat = Category(name=category_name, description=category_data.description)
            db.add(cat)
            db.flush()
            category_map[category_name] = cat

    # 2. Sync todos - add new, update existing, and assign positions
    for idx, ((category_name, todo_title), todo_data) in enumerate(config_todos.items()):
        key = (category_name, todo_title)
        category = category_map[category_name]

        # Calculate position within this category
        # Position is the index of this todo within its category's todos
        category_todos_list = [t for t in config_todos.keys() if t[0] == category_name]
        position = category_todos_list.index((category_name, todo_title))

        if key in existing_todos:
            # Update existing todo (preserve status and reset_count!)
            todo = existing_todos[key]
            todo.description = todo_data.description
            todo.category_id = category.id
            todo.reset_interval = todo_data.reset_interval
            todo.position = position  # type: ignore
            # Status and reset_count are preserved from database
        else:
            # Create new todo with default status (incomplete)
            todo = Todo(
                title=todo_title,
                description=todo_data.description,
                status=TaskStatus.incomplete,  # Always default to incomplete
                category_id=category.id,
                reset_interval=todo_data.reset_interval,
                reset_count=0,
                position=position,
            )
            db.add(todo)

    # 3. Remove stale todos (in DB but not in config)
    stale_todos = []
    for key, todo in existing_todos.items():
        if key not in config_todos:
            stale_todos.append(todo)

    for todo in stale_todos:
        db.delete(todo)

    if stale_todos:
        print(f"Removed {len(stale_todos)} stale todo(s)")

    # 4. Remove stale categories (in DB but not in config)
    stale_categories = []
    for category_name, category in existing_categories.items():
        if category_name not in config_categories:
            stale_categories.append(category)

    for category in stale_categories:
        db.delete(category)

    if stale_categories:
        print(f"Removed {len(stale_categories)} stale category/categories")

    db.commit()
    print(f"Database synced with config: {len(config_categories)} categories, {len(config_todos)} todos")

    # 5. Sync dependencies - must happen after todos are created
    sync_dependencies(db, config)


def sync_dependencies(db: Session, config: AppConfig):
    """Sync todo dependencies from config.

    Creates two types of dependency tables:
    1. TodoDependency - Explicit dependencies as defined in config (for graph visualization)
    2. TodoDependencyComputed - Fully expanded and recursive dependencies (for recommendations)
    """
    # Clear existing dependencies
    db.query(TodoDependency).delete()
    db.query(TodoDependencyComputed).delete()
    # Build todo lookup maps
    todo_id_map: dict[str, int] = {}  # (category_name, todo_title) -> todo object
    cat_todo_map: dict[str, set[int]] = {}  # category_name -> category object
    for todo in db.query(Todo).all():
        category = db.query(Category).filter(Category.id == todo.category_id).first()
        if category:
            if todo.title in todo_id_map:
                raise ValueError(f"Duplicate todo title '{todo.title}' found in database for dependency sync")

            todo_id_map[todo.title] = todo.id
            if category.name not in cat_todo_map:
                cat_todo_map[category.name] = set()
            cat_todo_map[category.name].add(todo.id)
        else:
            print(f"Warning: Todo '{todo.title}' has no valid category for dependency sync")
    category_id_map = {}
    for category in db.query(Category).all():
        category_id_map[category.name] = category.id


    explicit_deps = 0

    root_nodes = set()

    todo_dep_map = {}  # todo_id -> set of dependent todo_ids
    for category in config.categories:
        for todo in category.todos:
            has_deps = False
            todo_id = todo_id_map.get(todo.title)
            if not todo_id:
                continue

            # Explicit dependencies
            for dep in todo.depends_on_todos:
                dep_id = todo_id_map.get(dep)
                if dep_id:
                    # Add to explicit dependency table
                    explicit_deps += 1
                    todo_dep = TodoDependency(todo_id=todo_id, depends_on_todo_id=dep_id)
                    has_deps = True
                    db.add(todo_dep)
                    if dep_id not in todo_dep_map:
                        todo_dep_map[dep_id] = set()
                    todo_dep_map[dep_id].add(todo_id)
                else:
                    print(f"Warning: Cannot find todo '{dep}' in category '{category.name}' for dependency of todo '{todo.title}'")
            for dep_cat in todo.depends_on_categories:
                dep_cat_id = category_id_map.get(dep_cat)
                if dep_cat_id and (deps := cat_todo_map.get(dep_cat, set())):
                    for dep_todo_id in deps:
                        if dep_todo_id not in todo_dep_map:
                            todo_dep_map[dep_todo_id] = set()
                        todo_dep_map[dep_todo_id].add(todo_id)
                    explicit_deps += 1
                    todo_cat_dep = TodoDependency(
                        todo_id=todo_id, depends_on_category_id=dep_cat_id
                    )
                    has_deps = True
                    db.add(todo_cat_dep)
                else:
                    print(f"Warning: Cannot find category '{dep_cat}' for dependency of todo '{todo.title}'")
            if todo.depends_on_all_oneoffs:
                explicit_deps += 1
                todo_oneoff_dep = TodoDependency(
                    todo_id=todo_id, depends_on_all_oneoffs=1
                )
                db.add(todo_oneoff_dep)
            if not has_deps:
                root_nodes.add(todo_id)

    def recursive_dep_solver(todo_id: int, upstream_deps: set[int]):
        output_map: dict[int, set[int]] = dict()
        output_map[todo_id] = upstream_deps.copy()
        upstream_deps.add(todo_id)
        if todo_id not in todo_dep_map:
            return output_map
        for dep_id in todo_dep_map[todo_id]:
            if dep_id not in upstream_deps:
                for dep_id, deps in recursive_dep_solver(dep_id, upstream_deps.copy()).items():
                    if dep_id not in output_map:
                        output_map[dep_id] = deps
                    else:
                        output_map[dep_id].update(deps)
        return output_map

    deep_dep_map: dict[int, set[int]] = {}
    for root_id in root_nodes:
        deep_dep_map.update(recursive_dep_solver(root_id, set()))

    for todo_id, deps in deep_dep_map.items():
        for dep_id in deps:
            if dep_id != todo_id:
                comp_dep = TodoDependencyComputed(todo_id=todo_id, depends_on_todo_id=dep_id)
                db.add(comp_dep)
    db.commit()

    implicit_deps = sum(len(deps) for deps in deep_dep_map.values())
    print(f"Synchronized dependencies: {explicit_deps} explicit, {implicit_deps} implicit")


def initialize_database():
    """Initialize database and sync with config data"""
    # Run migrations to create/update tables
    alembic_cfg = Config("alembic.ini")
    alembic_cfg.set_main_option("script_location", "alembic")

    # Get current directory for proper path resolution
    current_dir = os.path.dirname(os.path.abspath(__file__))
    alembic_cfg.set_main_option("script_location", os.path.join(current_dir, "alembic"))

    # Run migrations
    command.upgrade(alembic_cfg, "head")

    # Sync with data from config
    db = SessionLocal()
    try:
        sync_db_from_config(db)
    finally:
        db.close()


if __name__ == "__main__":
    initialize_database()
