# Reports & Statistics

Track your task completion over time with built-in reporting.

## Reset Reports

Each reset operation generates a report containing:

- Total tasks
- Completed tasks count
- Skipped tasks count
- Incomplete tasks count
- Per-task details with in-progress duration


## Aggregated Statistics

Get statistics across multiple reports:

```bash
GET /api/statistics/{start_date}/{end_date}
```

Provides per-task metrics:

- **Completion rate**: Percentage of times completed
- **Skip rate**: Percentage of times skipped
- **Average in-progress duration**: Mean time spent working on task
- **Total appearances**: Number of reports containing this task

## Use Cases

### Track Habits

Monitor completion rates to see which habits stick:


### Identify Problems

Find tasks with low completion rates that may need adjustment.

### Time Analysis

See how long you spend in-progress on tasks.

## Next Steps

- [Reset Intervals](../configuration/reset-intervals.md) — Configure reset behavior
