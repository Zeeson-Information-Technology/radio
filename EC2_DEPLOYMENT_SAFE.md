# EC2 Gateway Deployment - Step by Step

**⚠️ IMPORTANT: Replace placeholder values with your actual credentials**
- Use the same values from your local `.env.local` file
- Never commit actual credentials to Git repositories

## Current Status
- ✅ SSH access working
- ✅ Git repository updated at `/opt/almanhaj-gateway-repo`
- ❌ Gateway .env file missing
- ❌ PM2 process not running properly

## Step-by-Step Deployment

### Step 1: Connect to EC2
```bash
cd C:\Users\ibrah\Downloads
ssh -i radio-key.pem ubuntu@98.93.42.61
```

### Step 2: Navigate to Gateway Directory
```bash
cd /opt/almanhaj-gateway-repo
git pull origin main
cd gateway
```

### Step 3: Create Production .env File
```bash
nano .env
```

Add this content (replace placeholders with actual values):
```env
# MongoDB Connection (Atlas - shared)
MONGODB_URI=YOUR_MONGODB_CONNECTION_STRING

# JWT Secret
JWT_SECRET=YOUR_JWT_SECRET

# Server Configuration
GATEWAY_PORT=8080
NODE_ENV=production
GATEWAY_HOST=production-server

# Next.js URLs (Production)
NEXTJS_URL=https://almanhaj.vercel.app
NEXTJS_API_URL=https://almanhaj.vercel.app
INTERNAL_API_KEY=YOUR_INTERNAL_API_KEY

# Icecast Configuration
ICECAST_HOST=98.93.42.61
ICECAST_PORT=8000
ICECAST_PASSWORD=YOUR_ICECAST_PASSWORD
ICECAST_MOUNT=/stream

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY
AWS_S3_BUCKET=almanhaj-radio-audio

# CORS Configuration (Production)
ALLOWED_ORIGINS=https://almanhaj.vercel.app,https://almanhaj.duckdns.org

# Audio Conversion
CONVERSION_TEMP_DIR=/tmp/audio-conversion
CONVERSION_MAX_CONCURRENT=2
```

Save with: `Ctrl+X`, then `Y`, then `Enter`

### Step 4: Install Dependencies
```bash
npm install
```

### Step 5: Stop Any Existing Gateway Processes
```bash
# Check for any running gateway processes
ps aux | grep node
ps aux | grep gateway

# Kill any existing processes (replace PID with actual process ID)
sudo kill -9 <PID>

# Check PM2 processes
pm2 list
pm2 stop all
pm2 delete all
```

### Step 6: Start Gateway with PM2
```bash
pm2 start server.js --name "almanhaj-gateway"
pm2 save
pm2 startup
```

### Step 7: Verify Gateway is Running
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs almanhaj-gateway --lines 20

# Test health endpoint
curl http://localhost:8080/health

# Check if gateway shows production URLs
pm2 logs almanhaj-gateway | grep "production-server"
```

### Step 8: Test from Outside
From your local machine, test:
```bash
curl http://98.93.42.61:8080/health
```

### Step 9: Final Verification
The gateway logs should show:
```
📡 HTTP API: http://production-server:8080
🔌 WebSocket: ws://production-server:8080
🌍 Environment: production
```

## Expected Results
- ✅ PM2 shows gateway running
- ✅ Health endpoint responds
- ✅ Logs show "production-server" instead of "localhost"
- ✅ External health check works

## Troubleshooting
If gateway doesn't start:
1. Check logs: `pm2 logs almanhaj-gateway`
2. Check .env file: `cat .env`
3. Check Node.js version: `node --version`
4. Check port availability: `sudo netstat -tlnp | grep 8080`

## Next Steps After Gateway Deployment
1. Set Vercel environment variables (see VERCEL_ENV_SETUP_SAFE.md)
2. Test file upload on Vercel
3. Test Weekly Schedule and Programs display