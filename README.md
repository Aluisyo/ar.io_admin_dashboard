# AR.IO Admin Dashboard

Professional web-based dashboard for monitoring, controlling, and managing AR.IO Gateway infrastructure and associated services.

## Features

- Real-time container status across services
- Start, stop, and restart services without full page reload
- Live logs with level and keyword filtering, auto-scroll, and download
- Secure Admin API key handling via NextAuth session protection
- Proxy endpoints for AR.IO Gateway admin actions (debug, queue-tx, block-data)
- Docker Compose setup for easy deployment

## Prerequisites

- Node.js v18+ or v20+
- npm or yarn
- Docker & Docker Compose (for containerized deployment)

## Environment Configuration

1. Copy and rename environment files:
   ```bash
   cp .env.dashboard.example .env.dashboard
   ```
2. Edit `.env.dashboard` with your values:
   ```dotenv
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin
   NEXTAUTH_SECRET=your-secret-key  #generate with: openssl rand -base64 32
   NEXTAUTH_URL=http://localhost:3001
   AR_IO_NODE_PATH=~/ar-io-node
   DOCKER_PROJECT=ar-io-node
   NEXT_PUBLIC_GRAFANA_URL=http://localhost:1024
   ADMIN_API_KEY=your-admin-api-key
   ```

## Local Development

Install dependencies:
```bash
npm ci
```

Run in development mode on port 3001:
```bash
npm run dev
```

Open http://localhost:3001 in your browser and log in with `ADMIN_USERNAME`/`ADMIN_PASSWORD`.

## Production Build

Build static assets:
```bash
npm run build
```

Start the server on port 3001:
```bash
npm run start
```

## Docker Deployment

### Build & Run Locally

```bash
docker compose -f docker-compose.dashboard.yaml up --build
```

This uses:
- Host port `3001` → container port `3001` (configurable via `DASHBOARD_PORT`)
- `.env.dashboard` for environment variables
- Mounts Docker socket (`/var/run/docker.sock`) to control other containers
- Attaches to the external `ar-io-network`
- Configurable volume paths for AR.IO node and backups

### Pull & Run Official Image

**Option 1: Using docker compose (Recommended)**
```bash
# Set environment variables (optional, defaults will be used)
export AR_IO_NODE_PATH="$HOME/ar-io-node"
export AR_IO_BACKUPS_PATH="$HOME/ar-io-backups"
export DASHBOARD_PORT="3001"

# Deploy the admin dashboard
docker compose -f docker-compose.dashboard.yaml pull
docker compose -f docker-compose.dashboard.yaml up -d
```

**Option 2: Direct docker run**
```bash
docker run -d \
  --name ar-io-admin-dashboard \
  --network ar-io-network \
  -p 3001:3001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v ~/ar-io-node:/home/node/ar-io-node \
  -v ~/ar-io-backups:/home/node/ar-io-backups \
  -v ./.env.dashboard:/app/.env.dashboard \
  -e HOME=/home/node \
  -e AR_IO_NODE_PATH=/home/node/ar-io-node \
  -e DOCKER_HOST=unix:///var/run/docker.sock \
  aluisyo/ar.io_admin_dashboard:latest
```


## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
