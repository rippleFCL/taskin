from sqlalchemy.orm import Session
from models import Category, Todo, TodoDependency, TaskStatus, init_db, SessionLocal
from config_loader import CONFIG, AppConfig, CategoryConfig, TodoConfig


def sync_db_from_config(db: Session, config_path: str = "config.yml"):
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

    # 2. Sync todos - add new, update existing
    for (category_name, todo_title), todo_data in config_todos.items():
        key = (category_name, todo_title)
        category = category_map[category_name]

        if key in existing_todos:
            # Update existing todo (preserve status and reset_count!)
            todo = existing_todos[key]
            todo.description = todo_data.description
            todo.category_id = category.id
            todo.reset_interval = todo_data.reset_interval 
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
    sync_dependencies(db, config, config_todos, category_map)


def sync_dependencies(db: Session, config: AppConfig, config_todos: dict, category_map: dict):
    """Sync todo dependencies from config"""
    # Clear existing dependencies
    db.query(TodoDependency).delete()

    # Build todo lookup map: title -> todo object
    todo_map = {}  # (category_name, todo_title) -> todo object
    for todo in db.query(Todo).all():
        category = db.query(Category).filter(Category.id == todo.category_id).first()
        if category:
            todo_map[(category.name, todo.title)] = todo

    # Create dependencies based on config
    for category_data in config.categories:
        category_name = category_data.name

        for todo_data in category_data.todos:
            todo_title = todo_data.title
            key = (category_name, todo_title)

            if key not in todo_map:
                continue

            todo = todo_map[key]

            # Handle depends_on_todos
            for dep_todo_title in todo_data.depends_on_todos:
                # Find the dependency todo (search across all categories)
                dep_todo = None
                for (cat_name, title), t in todo_map.items():
                    if title == dep_todo_title:
                        dep_todo = t
                        break

                if dep_todo:
                    dependency = TodoDependency(todo_id=todo.id, depends_on_todo_id=dep_todo.id)
                    db.add(dependency)

            # Handle depends_on_categories
            for dep_category_name in todo_data.depends_on_categories:
                if dep_category_name in category_map:
                    dependency = TodoDependency(todo_id=todo.id, depends_on_category_id=category_map[dep_category_name].id)
                    db.add(dependency)

            # Handle depends_on_all_oneoffs
            if todo_data.depends_on_all_oneoffs:
                dependency = TodoDependency(todo_id=todo.id, depends_on_all_oneoffs=1)
                db.add(dependency)

    db.commit()
    print("Dependencies synced")


def initialize_database():
    """Initialize database and sync with config data"""
    # Create tables
    init_db()

    # Sync with data from config
    db = SessionLocal()
    try:
        sync_db_from_config(db)
    finally:
        db.close()


if __name__ == "__main__":
    initialize_database()
