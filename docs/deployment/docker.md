# Docker Deployment

Deploy Taskin using Docker for easy setup and portability.

## Docker Image

The official Docker image is available on GitHub Container Registry:

```
ghcr.io/ripplefcl/taskin:latest
```

## Docker

### Basic Run Command

```bash
docker run -d \
  --name taskin \
  -p 8000:8000 \
  -v $(pwd)/config.yml:/app/config.yml:ro \
  -v taskin-data:/app/data \
  ghcr.io/ripplefcl/taskin:latest
```

## Next Steps

- [Docker Compose Setup](docker-compose.md) — Multi-container deployment
- [Configuration Guide](../configuration/index.md) — Set up your tasks
