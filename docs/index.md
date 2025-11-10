# Taskin Documentation

## Preamble

Im going to be honest. Taskin is a highly opinionated, custom, and specific to me software. Im putting it out there just in cases someone can find use in it. But most likely you may find this app more annoying/complex to use. Just keep in mind i build this for me, to meet my very specific need, thanks!

## What is Taskin?

Taskin helps you manage your daily routines and tasks by:

- **Dependency Management**: Define task dependencies so you complete things in the right order
- **Category Organization**: Group related tasks into categories for better structure
- **Automatic Resets**: Tasks automatically reset based on configurable intervals (daily, weekly, etc.)
- **Dependency Graph Visualization**: See your entire task hierarchy in an interactive graph
- **Smart Recommendations**: Get suggested tasks that are ready to work on based on completed dependencies
- **Progress Tracking**: Built-in statistics and reports to track completion rates over time

## Key Features

### Task Dependencies
!!! Note "Incomplete Config"
    This is for demo purposes see the Configuration.

Define dependencies between tasks or entire categories:

```yaml
todos:
  - title: "eat lunch"
    depends_on_todos:
      - "eat breakfast"
  - title: "clean desk"
    depends_on_categories:
      - "Morning Routine"
```

### Reset Intervals

Configure how often tasks should reset:

```yaml
todos:
  - title: "eat dinner"
    reset_interval: 1  # Daily
  - title: "eat lunch"
    reset_interval: 3  # Every 3 days
  - title: "do a flip"
    reset_interval: 7  # Weekly
```

### Interactive Dependency Graph

Visualize your entire task structure with an interactive Mermaid-based graph that shows:

- Task relationships and dependencies
- Category groupings with color coding
- Full or scoped views to focus on active tasks

### One-off Tasks

Manage ad-hoc tasks that don't fit into your regular routine:

- Create temporary tasks on the fly
- Set dependencies on regular tasks if needed
- Automatically tracked and recommended alongside regular tasks


## Getting Started

Ready to get started? Check out the [Quick Start Guide](quick-start.md) to set up Taskin using Docker.

## Use Cases

- **Daily Routines**: Morning routines, meal planning, personal care
- **Household Tasks**: Cleaning schedules, laundry, maintenance
- **Pet Care**: Regular feeding, grooming, and health check schedules
- **Habit Tracking**: Building consistent habits with dependency chains

## Additional Resources

- [Configuration Guide](configuration/index.md) — Define your tasks and dependencies
- [Docker Deployment](deployment/docker.md) — Deploy with Docker or Docker Compose
- [GitHub Repository](https://github.com/rippleFCL/taskin) — Source code and issues
