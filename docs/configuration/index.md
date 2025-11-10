# Configuration Overview

Taskin is configured through a single `config.yml` file that defines all your tasks, categories, and dependencies.

## Configuration File Location

When running with Docker, mount your configuration file to `/app/config.yml`:

```bash
-v $(pwd)/config.yml:/app/config.yml:ro
```

## Basic Structure

```yaml
categories:
  - name: Category Name
    description: Optional description
    todos:
      - title: Task Name
        description: Optional task description
        depends_on_todos: []
        depends_on_categories: []
        depends_on_all_oneoffs: false
        reset_interval: 1

oneoff_deps:
  depends_on_todos: []
  depends_on_categories: []
```

## Configuration Sections

### Categories

Categories group related tasks together. Each category contains:

- **name** (required): Unique category identifier
- **description** (optional): Human-readable description
- **todos** (required): List of tasks in this category

```yaml
categories:
  - name: Morning Routine
    description: "Tasks to complete each morning"
    todos:
      - title: "Wake up"
      - title: "Shower"
```

### Tasks (Todos)

Each task can have:

- **title** (required): Unique task name
- **description** (optional): Additional details
- **depends_on_todos** (optional): List of task titles this depends on
- **depends_on_categories** (optional): List of category names this depends on
- **depends_on_all_oneoffs** (optional): Wait for all one-off tasks
- **reset_interval** (optional): How many reset cycles before resetting (default: 1)

```yaml
todos:
  - title: "Eat breakfast"
    description: "Morning meal"
    depends_on_todos:
      - "Wake up"
    reset_interval: 1
```

### One-off Task Dependencies

Configure default dependencies for all one-off tasks:

```yaml
oneoff_deps:
  depends_on_todos:
    - "Wake up"
  depends_on_categories:
    - "Morning Routine"
```

## Validation Rules

### Task Names

- Must be unique across all categories
- Used as identifiers in dependency definitions
- Case-sensitive

### Category Names

- Must be unique
- Used as identifiers in category dependencies
- Case-sensitive

### Dependencies

- Task dependencies must reference existing task titles
- Category dependencies must reference existing category names

## Example Configuration

Here's a complete example showing various features:

```yaml
categories:
  - name: Food
    description: "Meal planning"
    todos:
      - title: "Make coffee"
      - title: "Breakfast"
        depends_on_todos:
          - "Make coffee"
      - title: "Lunch"
        depends_on_todos:
          - "Breakfast"
      - title: "Dinner"
        depends_on_todos:
          - "Lunch"

  - name: Morning Routine
    description: "Morning tasks"
    todos:
      - title: "Wake up"
      - title: "Shower"
        depends_on_todos:
          - "Wake up"
        reset_interval: 2  # Every other day
      - title: "Brush teeth"
        depends_on_todos:
          - "Breakfast"

  - name: Cleaning
    description: "Household chores"
    todos:
      - title: "Dishes"
        depends_on_categories:
          - "Morning Routine"
      - title: "Vacuum"
        depends_on_todos:
          - "Dishes"
        reset_interval: 7  # Weekly

oneoff_deps:
  depends_on_todos:
    - "Wake up"
```

## Reload Config

Taskin automatically reloads configuration on container restart. To apply changes:

```bash
# Docker
docker restart taskin

# Docker Compose
docker-compose restart taskin
```

!!! warning "Database Persistence"
    Task status and history are stored in the database. Changing task names in config.yml will create new tasks rather than renaming existing ones.

## Next Steps

- [Task Configuration](tasks.md) — Detailed task options
- [Dependencies](dependencies.md) — Understand dependency types
- [Reset Intervals](reset-intervals.md) — Configure task reset behavior
