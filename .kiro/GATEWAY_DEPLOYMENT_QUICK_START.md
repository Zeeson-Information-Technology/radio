# 🚀 Gateway Deployment - Quick Start Card

Print this or keep it open while deploying.

---

## 📍 You Are Here

- ✅ Build is complete
- ✅ Credentials are in `.env.local`
- ✅ Code is ready to deploy
- 👉 **NOW:** Set up DigitalOcean Droplet

---

## ⏱️ Timeline: 45 minutes total

| Phase | Duration | What | Where |
|-------|----------|------|-------|
| Portal Setup | 15 min | Create Droplet & Firewall | DigitalOcean.com |
| SSH & Install | 20 min | Connect & install software | Droplet terminal |
| Deploy & Test | 10 min | Start service & verify | Droplet terminal |
| **TOTAL** | **45 min** | Gateway running! | ✅ |

---

## 🎯 Three Main Steps

### STEP 1: Portal Setup (15 min)

**Read:** `.kiro/DIGITALOCEAN_STEP_BY_STEP.md`

**In DigitalOcean console, do:**
1. Create Droplet (Ubuntu 22.04, $6/month)
2. Create Firewall (5 inbound rules)
3. Note Droplet IP address

**Result:** IP address = `192.168.1.100` (example)

---

### STEP 2: Deploy Gateway (20 min)

**Read:** `.kiro/DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md`

**In your terminal, run:**
```bash
# SSH into Droplet (replace IP)
ssh -i ~/.ssh/id_rsa root@192.168.1.100

# Then on Droplet, run commands from the guide:
# - Install Node.js
# - Install FFmpeg
# - Install Icecast
# - Deploy code
# - Create .env file
# - Start service
```

**Result:** Gateway running on port 8080

---

### STEP 3: Test & Update Frontend (10 min)

**Test gateway:**
```bash
curl http://192.168.1.100:8080/health
```

**Expected:** `{"ok":true,"status":"ready"...}`

**Update Vercel environment variables:**
1. Go to https://vercel.com
2. Select project: `almanhaj`
3. Settings → Environment Variables
4. Update:
   - `GATEWAY_URL=http://192.168.1.100:8080`
   - `NEXT_PUBLIC_BROADCAST_GATEWAY_URL=ws://192.168.1.100:8080`
   - `STREAM_URL=http://192.168.1.100:8000/stream`
   - `NEXT_PUBLIC_STREAM_URL=http://192.168.1.100:8000/stream`
5. Redeploy: `git push`

**Result:** Frontend connected to gateway

---

## 🔑 Credentials (Copy from `.env.local`)

You'll need these during deployment:

```
MONGODB_URI=mongodb+srv://radio_user:okBJKJbtUS2KCTLE@...
JWT_SECRET=hujfidreukj78jrekjhrehre8hfd
AWS_REGION=lon1
AWS_ACCESS_KEY_ID=DO801PDKTMXXJJ8LGXGW
AWS_SECRET_ACCESS_KEY=4WAR+m7ZeS4Zby6ac+m23H0MhAj0yJGcmE8BmRkGUaA
AWS_S3_BUCKET=almanhaj-radio
AWS_ENDPOINT=https://lon1.digitaloceanspaces.com
```

**Don't share these!** They'll only be used in:
- Your local `.env.local` (git-ignored)
- Droplet `/opt/almanhaj-gateway/.env` (not in git)

---

## ✅ Success Checklist

**When complete, verify:**

- [ ] SSH works: `ssh root@YOUR_IP` connects
- [ ] Health check: `curl http://YOUR_IP:8080/health` returns 200
- [ ] Icecast: `curl http://YOUR_IP:8000/stream` accessible
- [ ] Frontend: https://almanhaj.vercel.app loads without errors
- [ ] Logs show no errors: `journalctl -u almanhaj-gateway -n 50`

---

## 🆘 Quick Troubleshooting

| Problem | Check | Command |
|---------|-------|---------|
| Can't SSH | Firewall rule 22? | `ufw status` |
| Gateway won't start | Logs? | `journalctl -u almanhaj-gateway -f` |
| Port 8080 not accessible | Firewall rule 8080? | `ufw allow 8080/tcp` |
| Icecast not streaming | Running? | `systemctl status icecast2` |
| Can't connect from browser | Env vars updated? | Check Vercel console |

---

## 📱 Keep These URLs Handy

- **DigitalOcean:** https://cloud.digitalocean.com
- **Vercel:** https://vercel.com
- **Radio Player:** https://almanhaj.vercel.app/radio
- **Gateway Health:** http://YOUR_DROPLET_IP:8080/health

---

## 📚 Documents in Order

1. **`.kiro/DIGITALOCEAN_STEP_BY_STEP.md`** ← Read first
   - Portal clicks
   - What to create

2. **`.kiro/DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md`** ← Then this
   - SSH commands
   - Installation steps
   - Troubleshooting

3. **`.kiro/DIGITALOCEAN_PORTAL_CHECKLIST.md`** ← Reference
   - Checklist format
   - Quick lookup

---

## 🎯 After Deployment

Once gateway is running:

**Next implementations:**
- [ ] Audio file injection API
- [ ] Queue management
- [ ] Stream health monitoring
- [ ] Admin UI controls
- [ ] Listener notifications

See: `.kiro/specs/radio-infrastructure-setup/tasks.md`

---

## 💡 Tips

**Terminal copy/paste:**
- Right-click to paste in terminal (can't use Ctrl+V)
- Use Ctrl+C to stop processes
- Use `clear` command to clear screen

**SSH key permissions:**
- If "Permission denied", run: `chmod 600 ~/.ssh/id_rsa`

**Droplet IP:**
- Write it down: `________________`
- Use it for all connections

**Firewall rules:**
- If anything doesn't work, check firewall first
- Command: `ufw status` shows all rules

---

## 🚀 Ready?

1. Open: `.kiro/DIGITALOCEAN_STEP_BY_STEP.md`
2. Create your Droplet
3. Come back for Step 2

**Good luck!** 🎙️📡

---

## 📞 Emergency Support

If completely stuck:

1. Check logs: `journalctl -u almanhaj-gateway -f`
2. Test connection: `curl http://YOUR_IP:8080/health`
3. Check firewall: `ufw status`
4. Check services running: `systemctl status almanhaj-gateway`
5. Review deployment guide troubleshooting section

All answers are in `.kiro/DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md`
