# Deployment Checklist

## 🧪 Local Testing Phase

### 1. Switch to Local Environment
```bash
node scripts/switch-environment.js local
```

### 2. Test Local Setup
```bash
# Start Next.js
npm run dev

# Start Gateway (in separate terminal)
cd gateway
npm start

# Validate local setup
node scripts/validate-deployment.js
```

### 3. Test Core Features Locally
- [ ] Admin login works
- [ ] Audio upload works
- [ ] Schedule displays correctly
- [ ] Live broadcasting works
- [ ] WebSocket connection works

## 🚀 Production Deployment Phase

### 1. Switch to Production Environment
```bash
node scripts/switch-environment.js prod
```

### 2. Deploy to Vercel
```bash
# Deploy to Vercel
vercel --prod

# Or push to main branch if auto-deploy is enabled
git add .
git commit -m "Production deployment"
git push origin main
```

### 3. Update Gateway on EC2
```bash
# Copy updated environment file
scp gateway/.env user@your-server:~/gateway/

# SSH into EC2 and restart gateway
ssh -i your-key.pem user@your-server
cd gateway
pm2 restart gateway
pm2 logs gateway
```

### 4. Validate Production Deployment
```bash
# Run validation script
node scripts/validate-deployment.js

# Check specific endpoints
curl https://your-app.vercel.app/api/live
curl http://your-server:8080/health
```

### 5. Test Production Features
- [ ] Vercel app loads correctly
- [ ] Admin login works on production
- [ ] Audio upload works on production
- [ ] Schedule displays correctly
- [ ] Live events work between admin and listeners
- [ ] WebSocket connection works from Vercel to EC2

## 🔍 Troubleshooting

### If Vercel Issues:
1. Check Vercel function logs
2. Verify environment variables in Vercel dashboard
3. Check API routes return correct responses

### If Gateway Issues:
1. SSH into EC2: `ssh -i key.pem user@server`
2. Check gateway status: `pm2 status`
3. Check gateway logs: `pm2 logs gateway`
4. Restart if needed: `pm2 restart gateway`

### If Icecast Issues:
1. Check Icecast status: `sudo systemctl status icecast2`
2. Restart if needed: `sudo systemctl restart icecast2`
3. Check Icecast logs: `sudo journalctl -u icecast2 -f`

## 📋 Environment Variables Checklist

### Vercel Environment Variables:
- [ ] `NODE_ENV=production`
- [ ] `MONGODB_URI` (same as local)
- [ ] `JWT_SECRET` (same as local)
- [ ] `GATEWAY_URL` (EC2 gateway URL)
- [ ] `NEXTAUTH_URL` (Vercel app URL)
- [ ] `STREAM_URL` (EC2 Icecast URL)
- [ ] `NEXT_PUBLIC_STREAM_URL` (EC2 Icecast URL)
- [ ] `NEXT_PUBLIC_BROADCAST_GATEWAY_URL` (EC2 WebSocket URL)
- [ ] `INTERNAL_API_KEY` (same as local)
- [ ] AWS credentials (same as local)

### EC2 Gateway Environment:
- [ ] `NODE_ENV=production`
- [ ] `NEXTJS_URL` (Vercel app URL)
- [ ] `NEXTJS_API_URL` (Vercel app URL)
- [ ] All other variables same as local

## 🎯 Success Criteria

### Local Testing Success:
- All features work on localhost
- No console errors
- WebSocket connects successfully
- Audio upload and conversion work

### Production Deployment Success:
- Vercel app loads without errors
- All API endpoints respond correctly
- Gateway is accessible from Vercel
- Live events work between admin and listeners
- Audio upload works on production
- Schedule displays correctly

## 🔄 Quick Commands Reference

```bash
# Check current environment
node scripts/switch-environment.js status

# Switch to local for testing
node scripts/switch-environment.js local

# Switch to production for deployment
node scripts/switch-environment.js prod

# Validate deployment
node scripts/validate-deployment.js

# Check gateway status
node scripts/check-gateway-status.js
```