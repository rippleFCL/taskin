# Taskin API

A simple FastAPI-based todo API with categories and SQLite storage.

## Features

- ✅ Category management
- ✅ Todo CRUD operations
- ✅ Status tracking (incomplete, in-progress, complete)
- ✅ SQLite database
- ✅ Database migrations with Alembic
- ✅ Initial data loading from config.yml
- ✅ RESTful API design

## Setup

### Prerequisites

- Python 3.9+
- Poetry

### Installation

1. Install dependencies:
```bash
cd taskin-api
poetry install
```

2. Activate the virtual environment:
```bash
poetry shell
```

3. Run database migrations:
```bash
poetry run python migrate.py upgrade
```

Or using alembic directly:
```bash
ENV=dev poetry run alembic upgrade head
```

## Running the API

Start the development server:
```bash
poetry run python main.py
```

Or using uvicorn directly:
```bash
poetry run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## API Documentation

Once the server is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## API Endpoints

### Categories

- `GET /api/categories` - Get all categories
- `GET /api/categories/{category_id}` - Get a specific category with todos
- `POST /api/categories` - Create a new category
- `DELETE /api/categories/{category_id}` - Delete a category

### Todos

- `GET /api/todos` - Get all todos (supports filtering by status and category_id)
- `GET /api/todos/{todo_id}` - Get a specific todo
- `POST /api/todos` - Create a new todo
- `PUT /api/todos/{todo_id}` - Update a todo
- `PATCH /api/todos/{todo_id}/status` - Update only the status of a todo
- `DELETE /api/todos/{todo_id}` - Delete a todo

## Configuration

Edit `config.yml` to customize the initial todos loaded into the database. The database is populated on first run.

## Database Migrations

This project uses Alembic for database migrations.

### Common Migration Commands

#### Using the migration helper script:

```bash
# Apply all pending migrations
poetry run python migrate.py upgrade

# Create a new migration after changing models
poetry run python migrate.py create "description_of_changes"

# Show current database revision
poetry run python migrate.py current

# Show migration history
poetry run python migrate.py history

# Downgrade to a specific revision
poetry run python migrate.py downgrade <revision_id>
```

#### Using Alembic directly:

```bash
# Apply all pending migrations
ENV=dev poetry run alembic upgrade head

# Create a new migration
ENV=dev poetry run alembic revision --autogenerate -m "description_of_changes"

# Show current revision
ENV=dev poetry run alembic current

# Show migration history
ENV=dev poetry run alembic history

# Downgrade one revision
ENV=dev poetry run alembic downgrade -1

# Downgrade to a specific revision
ENV=dev poetry run alembic downgrade <revision_id>
```

### Creating Migrations

When you modify the models in `models.py`, create a new migration:

1. Make your changes to `models.py`
2. Generate the migration:
   ```bash
   poetry run python migrate.py create "your_migration_description"
   ```
3. Review the generated migration file in `alembic/versions/`
4. Apply the migration:
   ```bash
   poetry run python migrate.py upgrade
   ```

### Status Values

- `incomplete` - Task not started
- `in-progress` - Task currently being worked on
- `complete` - Task finished

## Example Usage

### Create a new todo:
```bash
curl -X POST "http://localhost:8000/api/todos" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New task",
    "description": "Task description",
    "status": "incomplete",
    "category_id": 1
  }'
```

### Update todo status:
```bash
curl -X PATCH "http://localhost:8000/api/todos/1/status?status=complete"
```

### Get todos by category:
```bash
curl "http://localhost:8000/api/todos?category_id=1"
```

### Get todos by status:
```bash
curl "http://localhost:8000/api/todos?status=in-progress"
```

## Project Structure

```
taskin-api/
├── alembic/            # Database migrations
│   ├── versions/       # Migration scripts
│   ├── env.py         # Alembic environment
│   └── script.py.mako # Migration template
├── alembic.ini         # Alembic configuration
├── config.yml          # Initial todos configuration
├── db_init.py          # Database initialization
├── main.py             # FastAPI application entry point
├── migrate.py          # Migration helper script
├── models.py           # SQLAlchemy models
├── routes.py           # API routes/endpoints
├── schemas.py          # Pydantic schemas
├── pyproject.toml      # Poetry dependencies
└── taskin.db           # SQLite database (created on first run)
```
