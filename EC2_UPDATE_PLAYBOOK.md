# 🚀 EC2 Gateway Update Playbook

**Use this every time you push code to `main` branch and need to update EC2.**

---

## Prerequisites
- You have `radio-key.pem` in your Downloads folder
- You've pushed changes to `main` branch on GitHub
- You have SSH access to EC2 (98.93.42.61)

---

## ⚡ Quick Update (5 minutes)

### Step 1: SSH into EC2
```bash
cd C:\Users\ibrah\Downloads
ssh -i radio-key.pem ubuntu@98.93.42.61
```

Expected: You see `ubuntu@ip-172-31-78-34:~$`

### Step 2: Pull latest code from GitHub
```bash
cd /opt/almanhaj-gateway-repo
sudo git pull origin main
```

Expected: Shows `Updating ...` or `Already up to date`

### Step 3: Copy updated gateway files
```bash
sudo rm -rf /opt/almanhaj-gateway/*
sudo cp -r /opt/almanhaj-gateway-repo/gateway/* /opt/almanhaj-gateway/
sudo chown -R ubuntu:ubuntu /opt/almanhaj-gateway
```

### Step 4: Install dependencies (if package.json changed)
```bash
cd /opt/almanhaj-gateway
npm install --omit=dev
```

### Step 5: Restart gateway service
```bash
sudo systemctl restart almanhaj-gateway
```

### Step 6: Verify it's running
```bash
sudo systemctl status almanhaj-gateway --no-pager
```

Expected output:
```
Active: active (running)
🎙️ Broadcast Gateway listening on port 8080
📡 Icecast target: localhost:8000/stream
📊 Connected to MongoDB
```

### Step 7: Confirm port 8080 is listening
```bash
sudo ss -tulnp | grep 8080
```

Expected: Shows Node.js process bound to port 8080

---

## ✅ Health Check (verify everything works)

Run these to confirm the system is healthy:

### Check Icecast
```bash
sudo systemctl status icecast2 --no-pager
```
Expected: `active (running)`

### Check Gateway
```bash
sudo systemctl status almanhaj-gateway --no-pager
```
Expected: `active (running)` + "Connected to MongoDB"

### Check ports
```bash
sudo ss -tulnp | grep -E '8000|8080'
```
Expected: Both ports listening

### View gateway logs (if troubleshooting)
```bash
sudo journalctl -u almanhaj-gateway -f
```
Press `Ctrl+C` to exit

---

## 🧪 Functional Test (from browser)

1. **Presenter test:**
   - Go to: https://almanhaj.vercel.app/admin/live
   - Click "Start Broadcasting"
   - Allow microphone
   - Speak into mic
   - Check if broadcast starts

2. **Listener test:**
   - Open new tab: https://almanhaj.vercel.app/radio
   - Click play button
   - Audio should stream
   - No WebSocket errors in browser console

3. **If errors occur:**
   - Check gateway logs: `sudo journalctl -u almanhaj-gateway -n 50`
   - Check Icecast: `sudo systemctl status icecast2`
   - Restart both: `sudo systemctl restart almanhaj-gateway icecast2`

---

## 📋 One-Liner Update (copy-paste all at once)

If you want to run everything in one go:

```bash
cd /opt/almanhaj-gateway-repo && sudo git pull origin main && sudo rm -rf /opt/almanhaj-gateway/* && sudo cp -r /opt/almanhaj-gateway-repo/gateway/* /opt/almanhaj-gateway/ && sudo chown -R ubuntu:ubuntu /opt/almanhaj-gateway && cd /opt/almanhaj-gateway && npm install --omit=dev && sudo systemctl restart almanhaj-gateway && sudo systemctl status almanhaj-gateway --no-pager
```

---

## 🔧 Troubleshooting

### Gateway won't start
```bash
sudo journalctl -u almanhaj-gateway -n 20
```
Look for error messages. Common issues:
- Port 8080 already in use: `sudo lsof -i :8080`
- MongoDB connection failed: Check MONGODB_URI in .env
- JWT_SECRET mismatch: Verify .env matches Vercel

### Port 8080 in use
```bash
sudo lsof -i :8080
sudo kill -9 <PID>
sudo systemctl restart almanhaj-gateway
```

### Need to check/edit .env
```bash
sudo nano /opt/almanhaj-gateway/.env
```
Save: `Ctrl+X`, `Y`, `Enter`
Then restart: `sudo systemctl restart almanhaj-gateway`

### View live logs
```bash
sudo journalctl -u almanhaj-gateway -f
```

---

## 📌 Important Notes

✅ **Do this:**
- Push to `main` branch
- SSH and run this playbook
- Test in browser

❌ **Don't do this:**
- Edit files directly on EC2 (changes get overwritten on next pull)
- Manually restart without pulling (you'll miss updates)
- Give SSH access to presenters (they only use the website)

---

## 🎯 Summary

| Step | Command | Time |
|------|---------|------|
| SSH | `ssh -i radio-key.pem ubuntu@98.93.42.61` | 5s |
| Pull | `cd /opt/almanhaj-gateway-repo && sudo git pull origin main` | 10s |
| Copy | `sudo rm -rf /opt/almanhaj-gateway/* && sudo cp -r ...` | 5s |
| Install | `npm install --omit=dev` | 30s |
| Restart | `sudo systemctl restart almanhaj-gateway` | 5s |
| Verify | `sudo systemctl status almanhaj-gateway --no-pager` | 5s |
| **Total** | | **~1 minute** |

---

## 🚀 You're Production Ready!

Your system is now:
- ✅ Deployed on EC2
- ✅ Auto-starting on reboot
- ✅ Easy to update
- ✅ Monitoring-ready
- ✅ Presenter-friendly (no SSH needed for them)

**Next time you update:**
1. Push to main
2. Run this playbook
3. Test in browser
4. Done! 🎉