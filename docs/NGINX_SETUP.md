# NGINX Setup for AR.IO Admin Dashboard

This guide shows how to configure NGINX to provide external access to the AR.IO Admin Dashboard.

## Prerequisites

- AR.IO Gateway running with NGINX configured
- Admin Dashboard deployed via Docker Compose on port 3001
- SSL certificate (Let's Encrypt recommended)

## Deploy the Admin Dashboard

First, ensure your Admin Dashboard is running:

```bash
cd ~/ar-io-node
docker compose -f docker-compose.dashboard.yaml up -d
```

The dashboard will be accessible locally at `http://localhost:3001`.

## Configure NGINX

### Option 1: Path-based Setup (Recommended)

Configure the dashboard to run under `/admin` path by updating your `.env.dashboard` file:

```bash
# Set base path for reverse proxy deployment
NEXT_PUBLIC_BASE_PATH=/admin
NEXTAUTH_URL=https://<domain>/admin
```

Restart the dashboard:
```bash
docker compose -f docker-compose.dashboard.yaml down
docker compose -f docker-compose.dashboard.yaml up -d
```

Add to your existing NGINX server block:

```nginx
# force redirects http to https
server {
    listen 80;
    listen [::]:80;
    server_name <domain> *.<domain>;

    location / {
        return 301 https://$host$request_uri;
    }
}

# forwards traffic into your node and provides ssl certificates
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name <domain> *.<domain>;

    ssl_certificate /etc/letsencrypt/live/<domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
    }

    location /admin/ {
        proxy_pass http://localhost:3001/admin/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
    }
}
```

### Option 2: Subdomain Setup

For a dedicated subdomain like `admin.<domain>`:

```nginx
# force redirects http to https
server {
    listen 80;
    listen [::]:80;
    server_name <domain> *.<domain> admin.<domain>;

    location / {
        return 301 https://$host$request_uri;
    }
}

# Main gateway server
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name <domain> *.<domain>;

    ssl_certificate /etc/letsencrypt/live/<domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
    }
}

# Admin dashboard on subdomain
server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name admin.<domain>;

    ssl_certificate /etc/letsencrypt/live/<domain>/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/<domain>/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
    }
}
```

## Test the Configuration

```bash
# Test NGINX configuration
sudo nginx -t

# Reload NGINX
sudo systemctl reload nginx

# Check dashboard logs
docker compose -f docker-compose.dashboard.yaml logs -f --tail=25
```

## Access the Dashboard

- **Path-based**: `https://<domain>/admin`
- **Subdomain**: `https://admin.<domain>`

Log in with the credentials configured in your `.env.dashboard` file (`ADMIN_USERNAME` and `ADMIN_PASSWORD`).

## Troubleshooting

If you encounter issues:

1. Check that the dashboard container is running:
   ```bash
   docker ps | grep admin-dashboard
   ```

2. Verify the dashboard is responding on port 3001:
   ```bash
   curl http://localhost:3001
   ```

3. Check NGINX error logs:
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```
