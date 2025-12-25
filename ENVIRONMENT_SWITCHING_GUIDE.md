# Environment Switching Guide

## 🔄 Quick Environment Toggle

### 🧪 **Switch to LOCAL Development**

In `.env.local`, ensure these are **ACTIVE** (uncommented):

```bash
# LOCAL DEVELOPMENT CONFIGURATION (CURRENTLY ACTIVE)
NODE_ENV=development
LOG_LEVEL=debug
NEXT_PUBLIC_BROADCAST_GATEWAY_URL=ws://localhost:8080
GATEWAY_URL=http://localhost:8080
STREAM_URL=http://98.93.42.61:8000/stream  # Can use EC2 or local
ICECAST_HOST=localhost
ICECAST_PORT=8000
ICECAST_MOUNT=/stream
```

And these are **COMMENTED OUT**:
```bash
# PRODUCTION CONFIGURATION (COMMENTED OUT)
# NODE_ENV=production
# LOG_LEVEL=info
# NEXT_PUBLIC_BROADCAST_GATEWAY_URL=ws://98.93.42.61:8080
# GATEWAY_URL=http://98.93.42.61:8080
# etc...
```

### 🚀 **Switch to PRODUCTION**

In `.env.local`, **COMMENT OUT** the local section:
```bash
# LOCAL DEVELOPMENT CONFIGURATION (COMMENTED OUT)
# NODE_ENV=development
# LOG_LEVEL=debug
# NEXT_PUBLIC_BROADCAST_GATEWAY_URL=ws://localhost:8080
# GATEWAY_URL=http://localhost:8080
# etc...
```

And **UNCOMMENT** the production section:
```bash
# PRODUCTION CONFIGURATION (CURRENTLY ACTIVE)
NODE_ENV=production
LOG_LEVEL=info
NEXT_PUBLIC_BROADCAST_GATEWAY_URL=ws://98.93.42.61:8080
GATEWAY_URL=http://98.93.42.61:8080
STREAM_URL=http://98.93.42.61:8000/stream
ICECAST_HOST=98.93.42.61
ICECAST_PORT=8000
ICECAST_MOUNT=/stream
ICECAST_PASSWORD=live-source-82736
ALLOWED_ORIGINS=https://almanhaj.vercel.app,https://almanhaj.duckdns.org
```

## 📊 **Console Logging Levels**

### Local Development (`LOG_LEVEL=debug`)
- ✅ **Debug**: Detailed audio injection progress, WebSocket messages
- ✅ **Info**: System initialization, successful operations
- ✅ **Warn**: Potential issues, fallbacks
- ✅ **Error**: Critical failures with full stack traces

### Production (`LOG_LEVEL=info`)
- ❌ **Debug**: Disabled for performance
- ✅ **Info**: Essential operational messages
- ✅ **Warn**: Important warnings
- ✅ **Error**: Critical failures (minimal details)

## 🎯 **Testing Scenarios**

### Local Testing (Current Setup)
- **Audio Injection**: Full local testing ✅
- **WebSocket**: Local gateway ✅
- **Database**: Shared MongoDB Atlas ✅
- **File Storage**: Shared AWS S3 ✅
- **Stream Output**: Can use EC2 or local ✅

### Production Testing
- **Full EC2 Integration**: All services on EC2 ✅
- **Live Broadcasting**: Real stream output ✅
- **Production Logging**: Minimal, performance-focused ✅

## 🔧 **After Switching Environments**

1. **Restart Next.js**: `yarn dev` (stop and restart)
2. **Restart Gateway**: `node server.js` (if using local gateway)
3. **Clear Browser Cache**: Hard refresh (Ctrl+Shift+R)
4. **Check Console**: Verify correct logging level is active

## 🚨 **Important Notes**

- **Shared Resources**: Database and S3 are shared across environments
- **Gateway Sync**: Make sure gateway `.env` matches your choice
- **CORS Settings**: Production requires proper CORS configuration
- **SSL/TLS**: Production may require HTTPS for WebSocket connections