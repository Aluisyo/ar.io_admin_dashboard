# NGINX Setup for AR.IO Admin Dashboard

Simple guide to serve the admin dashboard at `/admin` path.

## Step 1: Build and Run Dashboard

```bash
cd ~/ar.io_admin_dashboard

# Build with base path
export NEXT_PUBLIC_BASE_PATH="/admin"
npm run build

# Copy required files
cp -r public .next/standalone/
cp -r .next/static .next/standalone/.next/

# Start the server
NEXT_PUBLIC_BASE_PATH="/admin" \
NEXTAUTH_URL="https://yourdomain.com/admin" \
PORT=3001 \
node .next/standalone/server.js
```

## Step 2: Configure NGINX

Add this to your NGINX config:

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Main gateway
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_http_version 1.1;
    }

    # Admin dashboard at /admin
    location ^~ /admin {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Step 3: Test and Reload

```bash
# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## Access Dashboard

Visit: `https://yourdomain.com/admin`

## Important Notes

- Use `location ^~ /admin` (no trailing slash)
- Use `proxy_pass http://localhost:3001` (no /admin suffix)
- Must include WebSocket headers (Upgrade, Connection)
- App must be built and run with `NEXT_PUBLIC_BASE_PATH="/admin"`
