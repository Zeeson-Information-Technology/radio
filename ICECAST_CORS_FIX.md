# Icecast CORS Headers Fix

## Problem

When trying to play the stream from a web browser, you get this error:

```
NS_BINDING_ABORTED
A resource is blocked by OpaqueResponseBlocking
```

This happens because:
1. The browser is trying to load audio from `http://98.93.42.61:8000/stream`
2. Icecast doesn't send CORS headers by default
3. The browser blocks the request for security reasons

## Solution: Add CORS Headers via Nginx Proxy

The best solution is to use Nginx as a reverse proxy with CORS headers. This also provides HTTPS support.

### Step 1: Update Nginx Configuration

SSH into your EC2 instance and edit the Nginx config:

```bash
ssh -i radio-key.pem ubuntu@98.93.42.61
sudo nano /etc/nginx/sites-available/default
```

Replace the entire file with:

```nginx
# Nginx Reverse Proxy for Icecast with CORS Headers

server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    # Logging
    access_log /var/log/nginx/icecast-access.log;
    error_log /var/log/nginx/icecast-error.log;

    # Stream endpoint with CORS headers
    location /stream {
        proxy_pass http://127.0.0.1:8000/stream;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Streaming optimizations
        proxy_buffering off;
        proxy_cache off;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        
        # Timeouts for long-lived connections
        proxy_connect_timeout 60s;
        proxy_send_timeout 3600s;
        proxy_read_timeout 3600s;
        
        # CORS headers - Allow browser access
        add_header Access-Control-Allow-Origin * always;
        add_header Access-Control-Allow-Methods 'GET, HEAD, OPTIONS' always;
        add_header Access-Control-Allow-Headers 'Range, Accept-Encoding, Content-Type' always;
        add_header Access-Control-Expose-Headers 'Content-Length, Content-Range' always;
        
        # Handle OPTIONS requests (CORS preflight)
        if ($request_method = 'OPTIONS') {
            add_header Access-Control-Allow-Origin * always;
            add_header Access-Control-Allow-Methods 'GET, HEAD, OPTIONS' always;
            add_header Access-Control-Allow-Headers 'Range, Accept-Encoding, Content-Type' always;
            add_header Content-Length 0;
            add_header Content-Type text/plain;
            return 204;
        }
    }

    # Icecast admin interface
    location /admin {
        proxy_pass http://127.0.0.1:8000/admin;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Icecast status page
    location /status.xsl {
        proxy_pass http://127.0.0.1:8000/status.xsl;
        proxy_set_header Host $host;
    }

    # Root location
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### Step 2: Test Nginx Configuration

```bash
sudo nginx -t
```

Expected output:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration will be successful
```

### Step 3: Reload Nginx

```bash
sudo systemctl reload nginx
```

### Step 4: Verify Nginx is Running

```bash
sudo systemctl status nginx
```

### Step 5: Test CORS Headers

From your local machine, test if CORS headers are present:

```bash
curl -I http://98.93.42.61/stream
```

You should see:

```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
Access-Control-Allow-Headers: Range, Accept-Encoding, Content-Type
```

### Step 6: Update Next.js Environment Variable

Update `.env.local` to use the Nginx proxy URL:

```env
# Use Nginx proxy (port 80) instead of direct Icecast (port 8000)
STREAM_URL=http://98.93.42.61/stream
```

### Step 7: Restart Next.js Application

If running on Vercel, redeploy. If running locally:

```bash
npm run dev
```

### Step 8: Test in Browser

1. Open your radio app: `https://almanhaj.vercel.app/radio`
2. Click the play button
3. Audio should now play without CORS errors

## Troubleshooting

### Still Getting CORS Errors

**Check Nginx is proxying correctly:**

```bash
# SSH into EC2
ssh -i radio-key.pem ubuntu@98.93.42.61

# Test Icecast directly
curl -I http://127.0.0.1:8000/stream

# Test Nginx proxy
curl -I http://127.0.0.1/stream

# Test from outside
curl -I http://98.93.42.61/stream
```

### Nginx Not Running

```bash
# Check status
sudo systemctl status nginx

# Start if stopped
sudo systemctl start nginx

# Check logs
sudo tail -f /var/log/nginx/icecast-error.log
```

### Stream Still Not Playing

**Check:**
1. Icecast is running: `sudo systemctl status icecast2`
2. Nginx is running: `sudo systemctl status nginx`
3. Firewall allows port 80: `sudo ufw status`
4. Stream URL in `.env.local` is correct

## Future: HTTPS Setup

For production, you should use HTTPS. Options:

### Option 1: Use a Domain with Let's Encrypt

1. Point a domain to your EC2 IP
2. Use Certbot to get a free SSL certificate
3. Update Nginx to use HTTPS

See `NGINX_HTTPS_SETUP.md` for detailed instructions.

### Option 2: Use Self-Signed Certificate (Development Only)

```bash
# Generate self-signed certificate
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout /etc/ssl/private/icecast.key \
  -out /etc/ssl/certs/icecast.crt

# Update Nginx to use HTTPS
sudo nano /etc/nginx/sites-available/default
```

Add to server block:

```nginx
listen 443 ssl;
ssl_certificate /etc/ssl/certs/icecast.crt;
ssl_certificate_key /etc/ssl/private/icecast.key;
```

## Reference

### CORS Headers Explained

| Header | Purpose |
|--------|---------|
| `Access-Control-Allow-Origin: *` | Allow requests from any origin |
| `Access-Control-Allow-Methods` | Allowed HTTP methods |
| `Access-Control-Allow-Headers` | Allowed request headers |
| `Access-Control-Expose-Headers` | Headers exposed to browser |

### Nginx Proxy Settings

| Setting | Purpose |
|---------|---------|
| `proxy_buffering off` | Don't buffer stream (needed for live audio) |
| `proxy_cache off` | Don't cache stream |
| `proxy_read_timeout 3600s` | Keep connection open for 1 hour |
| `proxy_http_version 1.1` | Use HTTP/1.1 for keep-alive |

---

**Last Updated:** December 12, 2025
