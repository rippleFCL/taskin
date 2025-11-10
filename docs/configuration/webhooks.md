# Webhooks

Taskin supports outgoing webhook notifications for specific events, allowing you to integrate with external services, notification systems, or automation workflows.

## Overview

When configured, Taskin will send HTTP POST requests to your webhook URL when certain events occur. Currently, webhooks are triggered when:

- **One-off tasks are created** — Receive notifications whenever a new one-off task is added

## Configuration

Add the webhook URL to your `config.yml` file:

```yaml
webhook_url: "https://your-domain.com/webhook/endpoint"

categories:
  - name: "Morning Routine"
    todos:
      - title: "Wake up"
```

### Supported URL Formats

The webhook URL must be a valid HTTP or HTTPS URL:

```yaml
# HTTPS (recommended for production)
webhook_url: "https://api.example.com/taskin/notifications"

# HTTP (development/testing only)
webhook_url: "http://localhost:3000/webhook"

# With authentication tokens
webhook_url: "https://api.example.com/webhook?token=your-secret-token"
```

!!! warning "URL Validation"
    The URL is validated using Pydantic's `HttpUrl` type. Invalid URLs will cause configuration validation to fail on startup.

## Event Payloads

### One-off Task Created

Triggered when a new one-off task is created via the API.

**HTTP Method:** `POST`

**Headers:**
```http
Content-Type: application/json
```

**Payload:**
```json
{
  "title": "Buy groceries"
}
```

**Fields:**
- `title` (string): The title of the newly created one-off task


## Future Enhancements

Potential webhook improvements (not yet implemented):

- Additional event types (task completion, reset events)
- Configurable retry logic
- Custom HTTP headers for authentication
- Webhook signatures for verification
- Multiple webhook URLs
- Event filtering/subscriptions
- Rate limiting
- Webhook delivery logs

## API Reference

For programmatic webhook management, see:

- [Configuration Reference](./index.md) — Complete configuration options

## Next Steps

- [One-off Tasks](./oneoff-tasks.md) — Learn about one-off task management
- [Docker Deployment](../deployment/docker.md) — Deploy Taskin with webhooks
