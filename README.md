# LifeOS - Principle-Based Planning

A planning and execution system based on Franklin Covey's methodology combined with bullet journaling.

## Features

- **Identity Layer**: Roles, values, goals
- **Task System**: Tasks with quadrants, subtasks, energy levels
- **Time Blocking**: Schedule tasks with configurable granularity
- **Weekly Planning**: Big Rocks workflow
- **Daily Execution**: Timeline view with bullet journal
- **Feedback**: Progress tracking and reinforcement

## Tech Stack

- **Frontend**: Next.js 14, React, Zustand
- **Backend**: Node.js, Express, Prisma
- **Database**: PostgreSQL
- **Logging**: Winston + Loki + Grafana

## Getting Started

```bash
# Install dependencies
yarn install

# Generate Prisma client
yarn db:generate

# Push schema to database
yarn db:push

# Start development
yarn dev
```

## Services

| Service | URL | Credentials |
|--------|-----|-------------|
| Web | http://localhost:3000 | - |
| API | http://localhost:4000 | - |
| Grafana | http://localhost:3001 | admin/admin |

## Development

```bash
# Start PostgreSQL
docker run -d --name lifeos-db -e POSTGRES_USER=lifeos -e POSTGRES_PASSWORD=lifeos123 -e POSTGRES_DB=lifeos -p 5432:5432 postgres:16

# Start Loki
docker run -d --name lifeos-loki -p 3100:3100 grafana/loki:latest

# Start Grafana
docker run -d --name lifeos-grafana -p 3001:3000 -e GF_SECURITY_ADMIN_PASSWORD=admin grafana/grafana:latest
```

## License

MIT