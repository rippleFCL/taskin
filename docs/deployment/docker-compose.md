# Docker Compose Deployment

Deploy Taskin with Docker Compose for easier management and configuration.

## Basic Setup

### docker-compose.yml

Create a `docker-compose.yml` file:

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
    environment:
      - UVICORN_HOST=0.0.0.0
      - UVICORN_PORT=8000
      - ENV=production
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s

volumes:
  taskin-data:
```

### Start Services

```bash
docker-compose up -d
```

### Stop Services

```bash
docker-compose down
```

## Directory Structure

Recommended project structure:

```
taskin/
├── docker-compose.yml
├── config.yml
└── backups/          # Optional: for database backups
```

## Next Steps

- [Configuration Guide](../configuration/index.md) — Set up your tasks
