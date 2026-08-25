# Radio Gateway Deployment Guides - Directory

Complete documentation for deploying the Al-Manhaj Radio gateway on DigitalOcean.

---

## 📖 Documents Created

### 1. **GATEWAY_DEPLOYMENT_QUICK_START.md** ⭐ START HERE
- **Time:** 2 minutes to read
- **Purpose:** Overview of what you'll do
- **Contains:**
  - 45-minute timeline
  - Three main steps
  - Success checklist
  - Quick troubleshooting

**👉 Read this first to understand the big picture**

---

### 2. **DIGITALOCEAN_STEP_BY_STEP.md** 
- **Time:** 15 minutes to complete
- **Purpose:** Exact clicks in DigitalOcean portal
- **Contains:**
  - Step-by-step portal instructions
  - What to enter in each field
  - Screenshots descriptions
  - Verification checklist

**👉 Follow this while logged into DigitalOcean**

---

### 3. **DIGITALOCEAN_PORTAL_CHECKLIST.md**
- **Time:** Reference during portal setup
- **Purpose:** Quick checklist format
- **Contains:**
  - Checklist of portal actions
  - Inbound firewall rules table
  - Credentials summary
  - Portal summary table

**👉 Use alongside Step-by-Step guide as quick reference**

---

### 4. **DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md** ⭐ MOST DETAILED
- **Time:** 30 minutes to complete
- **Purpose:** Complete SSH deployment guide
- **Contains:**
  - Every SSH command needed
  - Environment configuration
  - Service setup
  - Testing procedures
  - Extensive troubleshooting
  - Security best practices
  - Monitoring setup
  - Cost tracking

**👉 Follow this after portal setup is complete**

---

### 5. **RADIO_GATEWAY_DEPLOYMENT_SUMMARY.md**
- **Time:** 5 minutes to read
- **Purpose:** Complete overview of deployment
- **Contains:**
  - Architecture diagram
  - Cost analysis
  - Timeline
  - Credentials needed
  - Common issues & solutions
  - Deployment status tracker
  - Success criteria

**👉 Reference for understanding the full deployment**

---

### 6. **DEPLOYMENT_GUIDES_README.md** (this file)
- **Purpose:** Navigation guide
- **Contains:** Which guide to read when

---

## 🗺️ Recommended Reading Order

### First Time Deploying?

```
1. GATEWAY_DEPLOYMENT_QUICK_START.md (2 min)
   ↓
2. DIGITALOCEAN_STEP_BY_STEP.md (15 min, do portal setup)
   ↓
3. DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md (30 min, SSH commands)
   ↓
4. Verify with RADIO_GATEWAY_DEPLOYMENT_SUMMARY.md
```

### Already Familiar with the Setup?

```
1. GATEWAY_DEPLOYMENT_QUICK_START.md (overview)
   ↓
2. DIGITALOCEAN_PORTAL_CHECKLIST.md (quick checklist)
   ↓
3. Jump to specific sections in DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md
```

### Need Quick Reference?

```
- RADIO_GATEWAY_DEPLOYMENT_SUMMARY.md (overview)
- DIGITALOCEAN_PORTAL_CHECKLIST.md (checklist)
- DEPLOYMENT_GUIDES_README.md (this file)
```

---

## 📋 What Each Guide Teaches

### GATEWAY_DEPLOYMENT_QUICK_START.md
- What the deployment involves
- Timeline breakdown
- Three main phases
- Success criteria
- Emergency support

### DIGITALOCEAN_STEP_BY_STEP.md
- How to create a Droplet
- How to configure firewall
- How to create floating IP
- How to enable monitoring
- How to add SSH key
- What to verify when done

### DIGITALOCEAN_PORTAL_CHECKLIST.md
- Checklist format of portal tasks
- Table of firewall rules
- Credential reference
- Portal summary

### DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md
- How to SSH into Droplet
- How to install system dependencies
- How to deploy gateway code
- How to configure environment variables
- How to create systemd service
- How to test gateway
- How to update frontend
- Troubleshooting every common issue
- Security hardening
- Monitoring setup
- Cost tracking

### RADIO_GATEWAY_DEPLOYMENT_SUMMARY.md
- Complete architecture overview
- Cost analysis
- Timeline and credentials
- What to do in each phase
- Common issues and solutions
- Documentation files guide
- Success indicators
- Next steps after deployment

---

## 🎯 Deployment Phases Breakdown

### Phase 1: Portal Setup (15 min)
**Guides:** DIGITALOCEAN_STEP_BY_STEP.md or DIGITALOCEAN_PORTAL_CHECKLIST.md

**Tasks:**
- [ ] Create Droplet
- [ ] Create Firewall
- [ ] Create Floating IP (optional)
- [ ] Note IP address

**Result:** IP address ready for SSH

---

### Phase 2: SSH & Install (20 min)
**Guide:** DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md (Steps 2-6)

**Tasks:**
- [ ] SSH into Droplet
- [ ] Install Node.js
- [ ] Install FFmpeg
- [ ] Install Icecast
- [ ] Deploy code
- [ ] Create .env file

**Result:** Gateway code deployed

---

### Phase 3: Service Setup & Testing (10 min)
**Guide:** DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md (Steps 6-8)

**Tasks:**
- [ ] Create systemd service
- [ ] Start service
- [ ] Test gateway health
- [ ] Update Vercel env vars
- [ ] Verify frontend connection

**Result:** Gateway running and connected

---

## 💾 Files Needed During Deployment

### Before Starting
- SSH key: `~/.ssh/id_rsa`
- `.env.local` file (for credentials)

### During Portal Setup
- Nothing needed (all in DigitalOcean)

### During SSH Deployment
- These guides (printed or on screen)
- Your terminal
- Credentials from `.env.local`

### After Deployment
- Droplet IP address
- Floating IP (if created)
- Updated Vercel environment variables

---

## ✅ Verification Checklist

### Portal Setup Complete
- [ ] Droplet running (green status)
- [ ] Firewall created and assigned
- [ ] IP address noted
- [ ] SSH key configured

### SSH Deployment Complete
- [ ] SSH connection works
- [ ] Node.js installed (`node --version`)
- [ ] FFmpeg installed (`ffmpeg -version`)
- [ ] Icecast running (`systemctl status icecast2`)
- [ ] Gateway code deployed
- [ ] `.env` file created
- [ ] Systemd service created
- [ ] Service running (`systemctl status almanhaj-gateway`)

### Frontend Integration Complete
- [ ] Vercel env vars updated
- [ ] Frontend redeployed
- [ ] Radio player loads
- [ ] No console errors
- [ ] Gateway health check passes

---

## 🆘 Troubleshooting Quick Links

### Can't SSH
**Read:** DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md → Step 2 → Troubleshooting

### Gateway Won't Start
**Read:** DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md → Step 7 → Troubleshooting

### Firewall Blocking
**Read:** DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md → Step 9 → Firewall section

### Frontend Can't Connect
**Read:** RADIO_GATEWAY_DEPLOYMENT_SUMMARY.md → Common Issues & Solutions

### Icecast Not Streaming
**Read:** DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md → Step 9 → Icecast Issues

---

## 📊 Reference Tables

### Inbound Firewall Rules Needed
| Port | Protocol | Purpose |
|------|----------|---------|
| 22 | TCP | SSH access |
| 80 | TCP | HTTP (future) |
| 443 | TCP | HTTPS (future) |
| 8080 | TCP | Gateway API |
| 8000 | TCP | Icecast stream |

### Droplet Specifications
| Component | Setting |
|-----------|---------|
| OS | Ubuntu 22.04 LTS |
| Size | $6/month (2GB RAM) |
| Region | Your choice |
| Authentication | SSH key |

### Environment Variables
| Variable | From | Purpose |
|----------|------|---------|
| MONGODB_URI | `.env.local` | Database |
| JWT_SECRET | `.env.local` | Auth tokens |
| AWS_* | `.env.local` | Storage (Spaces) |
| ICECAST_* | Set during install | Streaming |

---

## 🔐 Security Reminders

- ✅ Never commit `.env` files
- ✅ Always use SSH keys (not passwords)
- ✅ Keep SSH key permissions: `chmod 600`
- ✅ Use firewall to restrict traffic
- ✅ Monitor Droplet CPU/Memory
- ✅ Enable backups for recovery

---

## 🚀 After Deployment

Once gateway is running:

**Next Phase:** Audio File Injection
- **Guide:** `.kiro/specs/radio-infrastructure-setup/design.md`
- **Tasks:** `.kiro/specs/radio-infrastructure-setup/tasks.md`

**What you'll implement:**
- API endpoint for file injection
- Queue management
- Stream health monitoring
- Admin UI controls

---

## 📞 Support Resources

### Inside These Guides
- Troubleshooting sections in deployment guide
- Common issues in summary
- Quick reference in portal checklist

### External Resources
- [DigitalOcean Docs](https://docs.digitalocean.com)
- [Ubuntu Documentation](https://ubuntu.com/support)
- [Icecast Manual](https://icecast.org/docs/icecast-latest/)
- [Node.js Documentation](https://nodejs.org/docs/)

---

## 🎯 You're Ready to Deploy!

### Next Step: Open This File
👉 **`.kiro/GATEWAY_DEPLOYMENT_QUICK_START.md`**

This will tell you:
- What you're about to do
- How long it takes
- What to expect

Then follow the other guides in order.

---

## 📝 Document Status

| Document | Status | Purpose |
|----------|--------|---------|
| GATEWAY_DEPLOYMENT_QUICK_START.md | ✅ Ready | Overview |
| DIGITALOCEAN_STEP_BY_STEP.md | ✅ Ready | Portal guide |
| DIGITALOCEAN_PORTAL_CHECKLIST.md | ✅ Ready | Quick reference |
| DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md | ✅ Ready | Detailed deployment |
| RADIO_GATEWAY_DEPLOYMENT_SUMMARY.md | ✅ Ready | Complete summary |
| DEPLOYMENT_GUIDES_README.md | ✅ Ready | This file |

**All guides complete and ready to use!** 🎉

---

## 🎉 You're All Set!

Everything you need to deploy the radio gateway is here.

**Start with:** `.kiro/GATEWAY_DEPLOYMENT_QUICK_START.md`

Good luck with your deployment! 🚀🎙️📡
