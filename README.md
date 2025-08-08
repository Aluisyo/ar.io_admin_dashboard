# AR.IO Admin Dashboard

This is the official AR.IO Gateway Admin Dashboard. It provides a web UI to monitor, control, and inspect your AR.IO Gateway and related services.

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
   mv .env.dashboard.example .env.dashboard
   ```
2. Edit `.env.dashboard` with your values:
   ```dotenv
   ADMIN_USERNAME=admin
   ADMIN_PASSWORD=admin
   NEXTAUTH_SECRET=your-secret-key
   NEXTAUTH_URL=http://localhost:3001
   AR_IO_NODE_PATH=/tmp/ar-io-node
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
docker-compose up --build
```

This uses:
- Host port `3001` → container port `3001`
- `.env.dashboard` for environment variables
- Mounts Docker socket (`/var/run/docker.sock`) to control other containers
- Attaches to the external `ar-io-network`

### Pull & Run Official Image

```bash
docker-compose pull
docker-compose up
```


## License

This project is licensed under the MIT License. See [LICENSE](./LICENSE) for details.
