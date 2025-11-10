# Task Configuration

Define individual tasks with dependencies, descriptions, and reset intervals.

## Task Structure

Each task is defined within a category:

```yaml
categories:
  - name: Category Name
    todos:
      - title: Task Name
        description: Optional description
        depends_on_todos: []
        depends_on_categories: []
        depends_on_all_oneoffs: false
        reset_interval: 1
```

## Required Fields

### title

**Type**: String
**Required**: Yes
**Unique**: Yes (across all categories)

The task name used as an identifier.

```yaml
- title: "Make coffee"
```

!!! warning "Uniqueness"
    Task titles must be unique across all categories. Duplicate titles will cause validation errors.

## Optional Fields

### description

**Type**: String
**Required**: No
**Default**: `null`

Additional context or notes about the task.

```yaml
- title: "Clean kitchen"
  description: "Wipe counters, sweep floor, do dishes"
```

### depends_on_todos

**Type**: List of strings
**Required**: No
**Default**: `[]`

List of task titles that must be completed before this task becomes available.

```yaml
- title: "Eat lunch"
  depends_on_todos:
    - "Eat breakfast"
    - "Make lunch"
```

### depends_on_categories

**Type**: List of strings
**Required**: No
**Default**: `[]`

List of category names where all tasks must be completed before this task becomes available.

```yaml
- title: "Clean house"
  depends_on_categories:
    - "Morning Routine"
    - "Kitchen Tasks"
```

### depends_on_all_oneoffs

**Type**: Boolean
**Required**: No
**Default**: `false`

Whether this task depends on all one-off tasks being completed.

```yaml
- title: "End of day review"
  depends_on_all_oneoffs: true
```

### reset_interval

**Type**: Integer
**Required**: No
**Default**: `1`

How many reset cycles before the task resets. See [Reset Intervals](reset-intervals.md) for details.

```yaml
- title: "Weekly cleaning"
  reset_interval: 7
```

## Task Examples

### Simple Task

No dependencies, resets daily:

```yaml
- title: "Wake up"
```

### Task with Dependencies

Depends on other tasks:

```yaml
- title: "Eat breakfast"
  description: "Morning meal"
  depends_on_todos:
    - "Wake up"
    - "Make coffee"
```

### Weekly Task

Resets every 7 days:

```yaml
- title: "Weekly cleaning"
  description: "Deep clean the house"
  reset_interval: 7
  depends_on_categories:
    - "Daily Cleaning"
```

### Complex Dependencies

Multiple dependency types:

```yaml
- title: "End of day routine"
  description: "Wind down for the evening"
  depends_on_todos:
    - "Eat dinner"
  depends_on_categories:
    - "Cleaning"
  depends_on_all_oneoffs: true
  reset_interval: 1
```

## Task States

Tasks progress through these states:

1. **incomplete** — Not yet started
2. **in-progress** — Currently working on
3. **complete** — Finished
4. **skipped** — Intentionally skipped

State transitions:

```mermaid
stateDiagram-v2
    [*] --> incomplete
    incomplete --> in-progress
    in-progress --> complete
    in-progress --> incomplete
    incomplete --> skipped
    skipped --> incomplete
    complete --> incomplete: Reset
```

## Task Recommendations

Tasks appear in the "Recommended" list when:

1. The task is `incomplete` or `in-progress`
2. All dependent tasks are `complete` or `skipped`
3. All dependent categories have all tasks `complete` or `skipped`
4. If `depends_on_all_oneoffs` is true, all one-off tasks are complete

## Validation Rules

### Title Validation

- Must not be empty
- Must be unique across all categories
- Case-sensitive

### Dependency Validation

- Referenced tasks must exist
- Referenced categories must exist
- Circular dependencies are prevented

!!! example "Circular Dependency (Invalid)"
    ```yaml
    - title: "Task A"
      depends_on_todos:
        - "Task B"
    - title: "Task B"
      depends_on_todos:
        - "Task A"  # Circular!
    ```

### Reset Interval Validation

- Must be a positive integer
- Recommended range: 1-30

## Best Practices

### Naming Conventions

Use clear, action-oriented names:

```yaml
# Good
- title: "Unload dishwasher"
- title: "Make breakfast"
- title: "Take out trash"

# Less clear
- title: "Dishwasher"
- title: "Food"
- title: "Trash"
```

### Grouping Related Tasks

Keep related tasks in the same category:

```yaml
categories:
  - name: Kitchen
    todos:
      - title: "Unload dishwasher"
      - title: "Load dishwasher"
      - title: "Wipe counters"
```

### Dependency Design

**Linear Chain** — Tasks follow a sequence:

```yaml
- title: "Step 1"
- title: "Step 2"
  depends_on_todos: ["Step 1"]
- title: "Step 3"
  depends_on_todos: ["Step 2"]
```

**Parallel Dependencies** — Multiple tasks must complete:

```yaml
- title: "Final task"
  depends_on_todos:
    - "Task A"
    - "Task B"
    - "Task C"
```

**Category Dependencies** — Wait for entire routine:

```yaml
- title: "Afternoon task"
  depends_on_categories:
    - "Morning Routine"
```

### Reset Interval Strategy

- Use `1` for daily tasks
- Use `2` for every-other-day tasks
- Use `7` for weekly tasks
- Use multiples of 7 for multi-week tasks

## Common Patterns

### Morning Routine

```yaml
categories:
  - name: Morning Routine
    todos:
      - title: "Wake up"

      - title: "Shower"
        depends_on_todos: ["Wake up"]
        reset_interval: 2

      - title: "Breakfast"
        depends_on_todos: ["Wake up"]

      - title: "Ready for day"
        depends_on_todos: ["Shower", "Breakfast"]
```

### Chore Schedule

```yaml
categories:
  - name: Cleaning
    todos:
      - title: "Daily tidy"
        reset_interval: 1

      - title: "Vacuum"
        reset_interval: 7
        depends_on_todos: ["Daily tidy"]

      - title: "Deep clean"
        reset_interval: 14
        depends_on_todos: ["Vacuum"]
```

### Meal Planning

```yaml
categories:
  - name: Meals
    todos:
      - title: "Breakfast"
      - title: "Lunch"
        depends_on_todos: ["Breakfast"]
      - title: "Dinner"
        depends_on_todos: ["Lunch"]
```

## Next Steps

- [Categories & Dependencies](dependencies.md) — Understand dependency types
- [Reset Intervals](reset-intervals.md) — Configure task reset behavior
- [Configuration Overview](index.md) — Complete configuration guide
