# LifeOS — Operations & Infrastructure

> Standard configurations for all projects under larspage

---

## 1. Logging Standard (All Applications)

**REQUIRED:** Every new application must integrate with Grafana + Loki.

| Feature | Implementation |
|---------|---------------|
| Library | Winston or Pino |
| Transport | Loki HTTP |
| Log levels | debug, info, warn, error (configurable at runtime) |
| Retention | 30 days default, auto-archive |

### Requirements for Every App

- [ ] Add Winston/Pino logger with Loki transport
- [ ] Generate/track correlation ID on every request
- [ ] Log correlation ID in all log statements
- [ ] Log request duration for all API calls (performance)
- [ ] Log database queries with duration (performance)
- [ ] Log external API calls with duration (performance)
- [ ] Log application startup/shutdown (information)
- [ ] Log CRUD operations (information)
- [ ] Log warnings for rate limits, retries (warning)
- [ ] Log all errors with stack trace (error)
- [ ] Configure log level via environment variable
- [ ] Configure alerts for threshold times
- [ ] Add application to Grafana dashboard

### Log Level Configuration

| Level | When to use |
|-------|-------------|
| debug | Detailed flow (dev only) |
| info | General operation |
| warn | Something unexpected, but handled |
| error | Exceptions, failures |

**Runtime control:** Log level can be changed without restarting via `/api/v1/targets` (Loki).

### Performance Logging

Every service endpoint should log:
```
{ "duration_ms": 150, "endpoint": "/api/tasks", "method": "GET" }
```

Set threshold alerts in Grafana:
- Warning: > 1000ms
- Error: > 5000ms

### Logging Points (Required in Every Application)

**PERFORMANCE (info):**
- API request start (with endpoint, method, correlation ID)
- API request complete (with duration_ms)
- Database query complete (with duration_ms, query type)
- External API call complete (with duration_ms, service name)
- Background job start/complete (with job name)

**INFORMATION (info):**
- Application startup
- Application shutdown
- User login/logout
- User created/updated/deleted
- Task created/updated/deleted
- Schedule created/updated/deleted

**WARNING (warn):**
- Rate limit approaching
- Disk space low
- Session about to expire
- Retry attempt on failed operation

**ERROR (error):**
- Unhandled exception
- Database connection failure
- External API failure
- Authentication failure
- Validation failure
- Any caught error that affects user

### Correlation ID

Every request should have a correlation ID for tracing:
- Generate on incoming request (or use existing)
- Pass to all downstream calls
- Include in all logs for that request
- Return in response headers

---

## 2. Alerting Rules

| Condition | Severity | Action |
|-----------|----------|--------|
| Request > X seconds | warning | Grafana alert → notification |
| Application down | critical | Email + Slack |
| Error rate > Y/min | warning | Email |

---

## 3. Dashboard

Grafana dashboard at `http://localhost:3000` shows:
- All applications
- Request counts
- Error rates
- Latency percentiles
- Active alerts

---

## 4. Container Stack

All projects use Docker Compose with:

```yaml
services:
  app:
    # Node/Next.js application
  
  db:
    # PostgreSQL 16
  
  loki:
    # Log aggregator
  
  grafana:
    # Dashboards (port 3000)
```

---

## 5. New Application Checklist

When creating a new application:

- [ ] Add to Docker Compose
- [ ] Add Winston logger with Loki transport
- [ ] Add to Grafana dashboard
- [ ] Set up log retention policy
- [ ] Configure threshold alerts
- [ ] Test error logging

---

*Last Updated: 2025-04-20*
*All projects: Follow this standard*