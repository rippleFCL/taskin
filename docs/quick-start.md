# Quick Start Guide

Get Taskin up and running in minutes with Docker.

## Prerequisites

- Docker and Docker Compose installed
- Basic understanding of YAML configuration

## Basic Setup

### 1. Pull the Docker Image

```bash
docker pull ghcr.io/ripplefcl/taskin:latest
```

Or build it yourself:

```bash
git clone https://github.com/rippleFCL/taskin.git
cd taskin
docker build -t taskin:latest -f Dockerfile .
```

### 2. Create Configuration

Create a `config.yml` file with your tasks:

```yaml
categories:
  - name: Morning Routine
    description: "Start your day right"
    todos:
      - title: "Wake up"
      - title: "Make coffee"
        depends_on_todos:
          - "Wake up"
      - title: "Breakfast"
        depends_on_todos:
          - "Make coffee"
```

### 3. Run with Docker

```bash
docker run -d \
  --name taskin \
  -p 8000:8000 \
  -v $(pwd)/config.yml:/app/config.yml:ro \
  -v taskin-data:/app/data \
  taskin:latest
```

### 4. Access the Application

Open your browser and navigate to:

```
http://localhost:8000
```

You should see your tasks organized by category!

## Docker Compose Setup

For a more permanent setup, create a `docker-compose.yml`:

```yaml
services:
  taskin:
    image: ghcr.io/ripplefcl/taskin:latest
    container_name: taskin
    ports:
      - "8000:8000"
    volumes:
      - ./config.yml:/app/config.yml:ro
      - taskin-data:/app/data
    restart: unless-stopped

volumes:
  taskin-data:
```

Then run:

```bash
docker-compose up -d
```

## Next Steps

Now that Taskin is running:

1. **Configure Your Tasks**: See [Task Configuration](configuration/tasks.md) to define your daily routines
2. **Set Up Dependencies**: Learn about [dependencies](configuration/dependencies.md) to create task chains
3. **Explore the Graph**: View the dependency graph at `/graph` to visualize your task structure
4. **Check Reports**: Access statistics and completion history at `/reports`

## Configuration Tips

- Start simple with a few tasks
- Test dependencies between tasks before adding complex chains
- Use meaningful category names to organize related tasks
- Set appropriate reset intervals based on how often you perform tasks

Ready to dive deeper? Continue to the [Configuration Guide](configuration/index.md).
