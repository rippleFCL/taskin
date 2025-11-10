# Reset Intervals

Configure how often tasks automatically reset to incomplete status.

## Overview

Reset intervals control task lifecycle management. Instead of manually resetting tasks, Taskin automatically resets them based on configured intervals.

## How It Works

### Reset Count

Each task tracks how many times it has been reset:

- When a task is marked `complete`, its `reset_count` increments
- When `reset_count % reset_interval == 0`, the task resets to `incomplete`
- The reset happens during the daily reset operation

### Daily Reset

Call the reset endpoint (typically via cron):

```bash
curl -X POST http://localhost:8000/api/reset
```

This evaluates all tasks and resets those due for reset.

## Configuration

### Setting Reset Interval

```yaml
todos:
  - title: "Daily task"
    reset_interval: 1     # Resets every day

  - title: "Weekly task"
    reset_interval: 7     # Resets every 7 days

  - title: "Monthly task"
    reset_interval: 30    # Resets every 30 days
```

### Default Value

If not specified, `reset_interval` defaults to `1` (daily).

```yaml
# These are equivalent
- title: "Task"

- title: "Task"
  reset_interval: 1
```

## Reset Behavior

### Complete Tasks

Tasks marked `complete` follow the reset interval:

```
Day 1: complete → reset_count = 1
Day 2: complete → reset_count = 2
Day 3: complete → reset_count = 3
```

With `reset_interval: 3`:

```
Day 1: complete (count=1) → stays complete
Day 2: complete (count=2) → stays complete
Day 3: complete (count=3) → resets to incomplete (3 % 3 == 0)
```

### Skipped Tasks

Tasks marked `skipped` **always reset** regardless of `reset_interval`:

```yaml
- title: "Task"
  reset_interval: 7  # Normally weekly
```

```
Day 1: skipped → resets to incomplete (ignores interval)
Day 2: skipped → resets to incomplete (ignores interval)
```

This prevents skipped tasks from accumulating indefinitely.

### Incomplete Tasks

Tasks that are `incomplete` or `in-progress` are not affected by reset.

## Common Intervals

### Daily (1)

```yaml
- title: "Brush teeth"
  reset_interval: 1
```

Resets every day regardless of completion.

### Every Other Day (2)

```yaml
- title: "Workout"
  reset_interval: 2
```

Resets on completion every 2 days.

### Twice per Week (~3)

```yaml
- title: "Deep cleaning"
  reset_interval: 3
```

Approximately twice per week if completed regularly.

### Weekly (7)

```yaml
- title: "Grocery shopping"
  reset_interval: 7
```

Resets once per week.

### Bi-weekly (14)

```yaml
- title: "Change sheets"
  reset_interval: 14
```

Every two weeks.

### Monthly (30)

```yaml
- title: "Pay bills"
  reset_interval: 30
```

Approximately monthly.

## Reset Strategies

### Flexible Schedule

Allow tasks to be completed on different days:

```yaml
categories:
  - name: Exercise
    todos:
      - title: "Cardio"
        reset_interval: 2
      - title: "Strength training"
        reset_interval: 2
```

You can complete either on any given day, and each tracks its own reset interval.

### Fixed Schedule

Create strict daily/weekly routines:

```yaml
categories:
  - name: Daily Routine
    todos:
      - title: "Morning coffee"
        reset_interval: 1
      - title: "Breakfast"
        reset_interval: 1
      - title: "Lunch"
        reset_interval: 1
```

All reset daily, enforcing the routine.

### Maintenance Tasks

Longer intervals for infrequent tasks:

```yaml
categories:
  - name: Home Maintenance
    todos:
      - title: "Check smoke alarms"
        reset_interval: 90
      - title: "Change AC filter"
        reset_interval: 60
      - title: "Deep clean fridge"
        reset_interval: 30
```

## Reset Reports

Each reset generates a report tracking:

- Total tasks
- Completed tasks
- Skipped tasks
- Incomplete tasks
- Per-task completion time

Access reports at `/reports` or via API:

```bash
curl "http://localhost:8000/api/reports/2025-01-01T00:00:00Z/2025-01-31T23:59:59Z"
```

## Automating Resets

### Cron Job

Set up a daily cron job to trigger resets:

```bash
# Runs daily at 3 AM
0 3 * * * curl -X POST http://localhost:8000/api/reset
```

### Docker with Cron

Add a cron container to your `docker-compose.yml`:

```yaml
services:
  taskin:
    # ... taskin config

  cron:
    image: alpine:latest
    container_name: taskin-cron
    command: >
      sh -c "echo '0 3 * * * wget -qO- http://taskin:8000/api/reset' | crontab - && crond -f"
    depends_on:
      - taskin
    restart: unless-stopped
```

### Systemd Timer

Create `/etc/systemd/system/taskin-reset.service`:

```ini
[Unit]
Description=Taskin Reset
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/bin/curl -X POST http://localhost:8000/api/reset
```

Create `/etc/systemd/system/taskin-reset.timer`:

```ini
[Unit]
Description=Daily Taskin Reset
Requires=taskin-reset.service

[Timer]
OnCalendar=daily
OnCalendar=03:00
Persistent=true

[Install]
WantedBy=timers.target
```

Enable:

```bash
sudo systemctl enable taskin-reset.timer
sudo systemctl start taskin-reset.timer
```

## Reset Statistics

View statistics across multiple resets:

```bash
curl "http://localhost:8000/api/statistics/2025-01-01T00:00:00Z/2025-01-31T23:59:59Z"
```

Provides:
- Completion rates per task
- Skip rates per task
- Average in-progress duration
- Total appearances in reports

## Example Configurations

### Personal Care

```yaml
categories:
  - name: Personal Care
    todos:
      - title: "Shower"
        reset_interval: 1
      - title: "Shave"
        reset_interval: 3
      - title: "Haircut"
        reset_interval: 21
      - title: "Nail trim"
        reset_interval: 10
```

### Cleaning Schedule

```yaml
categories:
  - name: Cleaning
    todos:
      - title: "Dishes"
        reset_interval: 1
      - title: "Sweep floors"
        reset_interval: 2
      - title: "Mop floors"
        reset_interval: 7
      - title: "Deep clean bathroom"
        reset_interval: 14
      - title: "Clean windows"
        reset_interval: 30
```

### Pet Care

```yaml
categories:
  - name: Pet Care
    todos:
      - title: "Feed morning"
        reset_interval: 1
      - title: "Feed evening"
        reset_interval: 1
      - title: "Change water"
        reset_interval: 2
      - title: "Clean litter"
        reset_interval: 3
      - title: "Grooming"
        reset_interval: 7
```

## Best Practices

### Start Conservative

Begin with shorter intervals, then adjust:

```yaml
# Start
- title: "Exercise"
  reset_interval: 1

# After observing behavior
- title: "Exercise"
  reset_interval: 2
```

### Align with Reality

Set intervals matching your actual schedule:

```yaml
# If you shower daily
- title: "Shower"
  reset_interval: 1

# If you shave every 2-3 days
- title: "Shave"
  reset_interval: 3
```

### Group Similar Intervals

Keep related tasks on similar schedules:

```yaml
categories:
  - name: Weekly Chores
    todos:
      - title: "Vacuum"
        reset_interval: 7
      - title: "Laundry"
        reset_interval: 7
      - title: "Grocery shopping"
        reset_interval: 7
```

### Use Statistics

Review completion rates to adjust intervals:

```bash
curl http://localhost:8000/api/statistics/start/end
```

If a task has low completion rate, consider:
- Increasing the interval
- Simplifying dependencies
- Breaking into smaller tasks

## Troubleshooting

### Task Not Resetting

Check:

1. **Is reset being called?**
   ```bash
   curl -X POST http://localhost:8000/api/reset
   ```

2. **Check reset count:**
   ```bash
   curl http://localhost:8000/api/todos/{id}
   ```

3. **Verify interval:**
   ```yaml
   - title: "Task"
     reset_interval: 7  # Correct?
   ```

### Task Resetting Too Often

Increase the interval:

```yaml
# Before
reset_interval: 1

# After
reset_interval: 3
```

### Task Resetting Too Rarely

Decrease the interval:

```yaml
# Before
reset_interval: 14

# After
reset_interval: 7
```

## Next Steps

- [Task Configuration](tasks.md) — Define tasks
- [Dependencies](dependencies.md) — Create task relationships
- [Reports](../features/reports.md) — Track completion statistics
