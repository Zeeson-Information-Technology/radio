# 🔧 Environment Variables Configuration Guide

This guide covers all environment variables needed for the Al-Manhaj Radio browser streaming system.

## 📋 **Overview**

The browser streaming system requires environment variables in two places:
1. **Next.js Application** (Vercel)
2. **Broadcast Gateway** (EC2)

**Critical:** The `JWT_SECRET` must be identical in both environments for authentication to work.

---

## 🌐 **Next.js Application (Vercel)**

### **Required Variables**

Add these to your Vercel project environment variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `NEXT_PUBLIC_GATEWAY_URL` | `wss://stream.almanhaj.duckdns.org` | WebSocket URL for browser to connect to gateway |
| `JWT_SECRET` | `your-super-secure-jwt-secret-key-here` | JWT signing secret (must match gateway) |
| `MONGODB_URI` | `mongodb+srv://user:pass@cluster.mongodb.net/db` | MongoDB connection string (existing) |

### **Optional Variables**

| Variable | Default | Description |
|----------|---------|-------------|
| `NEXT_PUBLIC_STREAM_URL` | `https://almanhaj.duckdns.org/stream` | Public stream URL for listeners (existing) |
| `NEXT_PUBLIC_GATEWAY_TIMEOUT` | `10000` | WebSocket connection timeout (ms) |

### **Setting Variables in Vercel**

1. Go to your Vercel dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add each variable:

```bash
# Production Environment
NEXT_PUBLIC_GATEWAY_URL=wss://stream.almanhaj.duckdns.org
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Development Environment (optional)
NEXT_PUBLIC_GATEWAY_URL=ws://localhost:8080
JWT_SECRET=your-super-secure-jwt-secret-key-here
```

---

## 🖥️ **Broadcast Gateway (EC2)**

### **Required Variables**

Create `/opt/almanhaj-gateway/.env` file:

```bash
# Gateway Server Configuration
GATEWAY_PORT=8080
NODE_ENV=production

# JWT Authentication (MUST match Next.js)
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Icecast Server Configuration
ICECAST_HOST=localhost
ICECAST_PORT=8000
ICECAST_PASSWORD=your-icecast-source-password
ICECAST_MOUNT=/stream

# Logging Configuration
LOG_LEVEL=info

# Security Configuration
ALLOWED_ORIGINS=https://your-radio-app.vercel.app,http://localhost:3000
```

### **Variable Details**

#### **Gateway Configuration**

| Variable | Example | Description |
|----------|---------|-------------|
| `GATEWAY_PORT` | `8080` | Port for WebSocket server |
| `NODE_ENV` | `production` | Node.js environment |

#### **Authentication**

| Variable | Example | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `your-super-secure-jwt-secret-key-here` | **CRITICAL:** Must match Next.js exactly |

#### **Icecast Configuration**

| Variable | Example | Description |
|----------|---------|-------------|
| `ICECAST_HOST` | `localhost` | Icecast server hostname |
| `ICECAST_PORT` | `8000` | Icecast server port |
| `ICECAST_PASSWORD` | `your-password` | Icecast source password |
| `ICECAST_MOUNT` | `/stream` | Icecast mount point |

#### **Security**

| Variable | Example | Description |
|----------|---------|-------------|
| `ALLOWED_ORIGINS` | `https://app.vercel.app,http://localhost:3000` | Comma-separated list of allowed origins |

#### **Logging**

| Variable | Options | Description |
|----------|---------|-------------|
| `LOG_LEVEL` | `error`, `warn`, `info`, `debug` | Logging verbosity level |

---

## 🔐 **Security Best Practices**

### **JWT Secret Generation**

Generate a strong JWT secret:

```bash
# Method 1: Using OpenSSL
openssl rand -base64 64

# Method 2: Using Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# Method 3: Using online generator
# Visit: https://generate-secret.vercel.app/64
```

**Example output:**
```
your-super-secure-jwt-secret-key-here-replace-this-with-actual-secret
```

### **Environment File Security**

```bash
# Set proper permissions on EC2
chmod 600 /opt/almanhaj-gateway/.env
chown ubuntu:ubuntu /opt/almanhaj-gateway/.env

# Verify permissions
ls -la /opt/almanhaj-gateway/.env
# Should show: -rw------- 1 ubuntu ubuntu
```

### **Icecast Password Security**

```bash
# Check your Icecast configuration
sudo nano /etc/icecast2/icecast.xml

# Look for source-password:
<source-password>your-icecast-source-password</source-password>

# Use this exact password in ICECAST_PASSWORD
```

---

## 🧪 **Testing Configuration**

### **Test 1: JWT Secret Matching**

**On EC2 (Gateway):**
```bash
cd /opt/almanhaj-gateway
node -e "console.log('Gateway JWT:', process.env.JWT_SECRET)" 
```

**In Next.js (check Vercel logs):**
```javascript
// This should appear in your Vercel function logs
console.log('Next.js JWT:', process.env.JWT_SECRET);
```

**Both should output the same value.**

### **Test 2: Gateway Environment Loading**

```bash
cd /opt/almanhaj-gateway

# Test environment loading
node -e "
require('dotenv').config();
console.log('Port:', process.env.GATEWAY_PORT);
console.log('Icecast Host:', process.env.ICECAST_HOST);
console.log('JWT Secret Length:', process.env.JWT_SECRET?.length);
console.log('Allowed Origins:', process.env.ALLOWED_ORIGINS);
"
```

**Expected output:**
```
Port: 8080
Icecast Host: localhost
JWT Secret Length: 88
Allowed Origins: https://your-radio-app.vercel.app,http://localhost:3000
```

### **Test 3: Icecast Connection**

```bash
# Test Icecast connectivity with your credentials
curl -u "source:$ICECAST_PASSWORD" http://localhost:8000/admin/stats.xml
```

---

## 🔄 **Development vs Production**

### **Development Environment**

**Next.js (.env.local):**
```bash
NEXT_PUBLIC_GATEWAY_URL=ws://localhost:8080
JWT_SECRET=dev-jwt-secret-for-testing-only
MONGODB_URI=mongodb://localhost:27017/almanhaj-dev
```

**Gateway (.env):**
```bash
GATEWAY_PORT=8080
NODE_ENV=development
JWT_SECRET=dev-jwt-secret-for-testing-only
ICECAST_HOST=localhost
ICECAST_PORT=8000
ICECAST_PASSWORD=hackme
ICECAST_MOUNT=/stream
LOG_LEVEL=debug
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### **Production Environment**

**Next.js (Vercel):**
```bash
NEXT_PUBLIC_GATEWAY_URL=wss://stream.almanhaj.duckdns.org
JWT_SECRET=your-super-secure-production-jwt-secret
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/almanhaj
```

**Gateway (EC2):**
```bash
GATEWAY_PORT=8080
NODE_ENV=production
JWT_SECRET=your-super-secure-production-jwt-secret
ICECAST_HOST=localhost
ICECAST_PORT=8000
ICECAST_PASSWORD=your-secure-icecast-password
ICECAST_MOUNT=/stream
LOG_LEVEL=info
ALLOWED_ORIGINS=https://your-radio-app.vercel.app
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **"Invalid or expired token" Error**

**Cause:** JWT secrets don't match between Next.js and Gateway

**Solution:**
```bash
# Check Next.js JWT secret (Vercel dashboard)
# Check Gateway JWT secret
cat /opt/almanhaj-gateway/.env | grep JWT_SECRET

# They must be identical
```

#### **"Connection rejected: No token provided"**

**Cause:** Next.js can't generate tokens or Gateway URL is wrong

**Solution:**
```bash
# Check NEXT_PUBLIC_GATEWAY_URL in Vercel
# Check if Gateway is accessible:
curl -I https://stream.almanhaj.duckdns.org
```

#### **"Failed to connect to broadcast server"**

**Cause:** Gateway not running or network issues

**Solution:**
```bash
# Check Gateway service
sudo systemctl status almanhaj-gateway

# Check port listening
sudo netstat -tlnp | grep 8080

# Check Nginx proxy
sudo nginx -t
```

#### **"Icecast connection failed"**

**Cause:** Wrong Icecast credentials or Icecast not running

**Solution:**
```bash
# Check Icecast status
sudo systemctl status icecast2

# Test credentials
curl -u "source:$ICECAST_PASSWORD" http://localhost:8000/admin/stats.xml

# Check Icecast logs
sudo tail -f /var/log/icecast2/error.log
```

---

## 📝 **Environment File Templates**

### **Next.js Template (.env.local)**

```bash
# Al-Manhaj Radio - Next.js Environment Variables
# Copy this to .env.local for local development

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/almanhaj

# Authentication
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Browser Streaming
NEXT_PUBLIC_GATEWAY_URL=ws://localhost:8080

# Public Stream (existing)
NEXT_PUBLIC_STREAM_URL=https://almanhaj.duckdns.org/stream

# Optional: Streaming timeouts
NEXT_PUBLIC_GATEWAY_TIMEOUT=10000
```

### **Gateway Template (.env)**

```bash
# Al-Manhaj Radio - Broadcast Gateway Environment Variables
# Copy this to /opt/almanhaj-gateway/.env on EC2

# Gateway Server Configuration
GATEWAY_PORT=8080
NODE_ENV=production

# JWT Authentication (MUST match Next.js app)
JWT_SECRET=your-super-secure-jwt-secret-key-here

# Icecast Server Configuration
ICECAST_HOST=localhost
ICECAST_PORT=8000
ICECAST_PASSWORD=your-icecast-source-password
ICECAST_MOUNT=/stream

# Logging
LOG_LEVEL=info

# Security
ALLOWED_ORIGINS=https://your-radio-app.vercel.app,http://localhost:3000

# Optional: Advanced Configuration
# GATEWAY_MAX_CONNECTIONS=10
# GATEWAY_HEARTBEAT_INTERVAL=30000
# FFMPEG_BITRATE=96
# FFMPEG_SAMPLE_RATE=44100
```

---

## 🔄 **Updating Environment Variables**

### **Updating Next.js Variables (Vercel)**

1. Go to Vercel dashboard
2. Select project → Settings → Environment Variables
3. Edit the variable
4. **Important:** Redeploy your application after changes

```bash
# Trigger redeployment
git commit --allow-empty -m "Update environment variables"
git push
```

### **Updating Gateway Variables (EC2)**

```bash
# Edit environment file
nano /opt/almanhaj-gateway/.env

# Restart gateway service to apply changes
sudo systemctl restart almanhaj-gateway

# Verify changes took effect
sudo journalctl -u almanhaj-gateway -n 20
```

---

## ✅ **Configuration Checklist**

### **Pre-Deployment**
- [ ] JWT secret generated (64+ characters)
- [ ] Icecast password obtained
- [ ] Domain/subdomain configured
- [ ] SSL certificate ready

### **Next.js Configuration**
- [ ] `NEXT_PUBLIC_GATEWAY_URL` set correctly
- [ ] `JWT_SECRET` matches gateway
- [ ] Variables added to Vercel
- [ ] Application redeployed

### **Gateway Configuration**
- [ ] All required variables set in `.env`
- [ ] File permissions secured (600)
- [ ] JWT secret matches Next.js
- [ ] Icecast credentials correct

### **Testing**
- [ ] Gateway service starts successfully
- [ ] WebSocket connection works
- [ ] JWT authentication passes
- [ ] Audio streams to Icecast
- [ ] End-to-end browser streaming works

---

## 📞 **Support**

If you encounter environment variable issues:

1. **Check syntax:** No spaces around `=`, no quotes unless needed
2. **Check permissions:** `.env` file should be readable by service
3. **Check matching:** JWT secrets must be identical
4. **Check logs:** Service logs show environment loading errors
5. **Test individually:** Test each component separately

Remember: Environment variables are the foundation of the system. Take time to configure them correctly for a smooth deployment experience.

جزاكم الله خيرا