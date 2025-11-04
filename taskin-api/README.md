# Taskin API

A simple FastAPI-based todo API with categories and SQLite storage.

## Features

- ✅ Category management
- ✅ Todo CRUD operations
- ✅ Status tracking (incomplete, in-progress, complete)
- ✅ SQLite database
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
├── config.yml          # Initial todos configuration
├── db_init.py          # Database initialization
├── main.py             # FastAPI application entry point
├── models.py           # SQLAlchemy models
├── routes.py           # API routes/endpoints
├── schemas.py          # Pydantic schemas
├── pyproject.toml      # Poetry dependencies
└── taskin.db           # SQLite database (created on first run)
```
