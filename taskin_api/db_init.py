from sqlalchemy.orm import Session
from models import Category, Event, Todo, TaskStatus, SessionLocal
from dep_manager import dep_man
from config_loader import CONFIG, CategoryConfig, TodoConfig
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
    config_event_names: set[str] = set()
    for category_data in config.categories:
        category_name = category_data.name
        config_categories[category_name] = category_data

        for todo_data in category_data.todos:
            key = (category_name, todo_data.title)
            config_todos[key] = todo_data
            for event_data in todo_data.depends_on_events.keys():
                config_event_names.add(event_data)

    # Get existing data from database
    existing_categories = {cat.name: cat for cat in db.query(Category).all()}
    existing_todos: dict[tuple[str, str], Todo] = {}  # key: (category_name, todo_title) -> todo object
    existing_events = {event.name: event for event in db.query(Event).all()}

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

    for event_name in config_event_names:
        if event_name not in existing_events:
            event = Event(name=event_name)
            db.add(event)

    stale_events = []
    for event_name, event in existing_events.items():
        if event_name not in config_event_names:
            stale_events.append(event)

    for event in stale_events:
        db.delete(event)

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
    print(f"Database synced with config: {len(config_categories)} categories, {len(config_todos)} todos, {len(config_event_names)} events")

    dep_man.load_from_db(categories=db.query(Category).all(), events=db.query(Event).all())

    unready_todos = db.query(Todo.id).filter(Todo.reset_count > 0).all()
    unready_ids = {tid for (tid,) in unready_todos}
    dep_man.scope_subgraph(unready_ids)


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
