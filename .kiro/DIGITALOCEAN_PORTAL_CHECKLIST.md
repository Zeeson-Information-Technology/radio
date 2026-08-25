# DigitalOcean Portal - Action Checklist

Quick reference for what to do in the DigitalOcean portal before deploying the gateway.

---

## 🚀 Step 1: Create Droplet (5 minutes)

### Location: https://cloud.digitalocean.com → Create → Droplets

**Configuration:**
- [ ] **OS Image**: Ubuntu 22.04 LTS (or 24.04 LTS)
- [ ] **Plan**: $6/month (2GB RAM, 1 vCPU)
- [ ] **Region**: Choose closest to your location
- [ ] **Authentication**: SSH key (recommended)
- [ ] **Hostname**: `almanhaj-gateway` (optional)
- [ ] **Backups**: Enable (optional, adds $1.20/month)

**Result:** Droplet created, note the **IP address** (e.g., `192.168.1.1`)

---

## 🔒 Step 2: Configure Firewall (3 minutes)

### Location: https://cloud.digitalocean.com → Networking → Firewalls

**Create New Firewall:**
- [ ] Name: `almanhaj-gateway-firewall`

**Inbound Rules - Add:**
| Protocol | Port | Source | Purpose |
|----------|------|--------|---------|
| TCP | 22 | Your IP (or Anywhere) | SSH access |
| TCP | 80 | Anywhere | HTTP (future) |
| TCP | 443 | Anywhere | HTTPS (future) |
| TCP | 8080 | Anywhere | Gateway API |
| TCP | 8000 | Anywhere | Icecast stream |

**Outbound Rules:**
- [ ] Keep default (Allow all)

**Apply Firewall:**
- [ ] Add to your Droplet: `almanhaj-gateway`

---

## 🌐 Step 3: Configure Static IP (Optional - 2 minutes)

### Location: https://cloud.digitalocean.com → Networking → Floating IPs

**If you want a static IP that won't change:**
- [ ] Click "Reserve a Floating IP"
- [ ] Assign to: `almanhaj-gateway` Droplet
- [ ] Note the Floating IP address

**Benefits:**
- IP stays the same if Droplet restarts
- No need to update DNS/config on crashes
- Good for production reliability

---

## 📊 Step 4: Configure Monitoring (Optional - 2 minutes)

### Location: https://cloud.digitalocean.com → Monitoring

**Enable Droplet Monitoring:**
- [ ] Click your Droplet
- [ ] Enable Monitoring → "Enable"
- [ ] Alerts (optional): CPU > 80%, Memory > 80%

**Useful for:**
- Tracking resource usage
- Alerting if service goes down
- Planning upgrades

---

## 🔑 Step 5: Configure SSH Key (Optional - Already Done)

### Location: https://cloud.digitalocean.com → Settings → Security → SSH Keys

**If not already done:**
- [ ] Add SSH key: Paste your public key (`~/.ssh/id_rsa.pub`)
- [ ] Name: `My Machine`
- [ ] Add Key

**This allows:**
- SSH login without password
- Secure automated deployments

---

## 💾 Step 6: Enable Automated Backups (Optional - 1 minute)

### Location: Droplet page → Backups (Tab)

**Automatic Backups:**
- [ ] Enable "Backups"
- [ ] Cost: +$1.20/month
- [ ] Frequency: Daily, Weekly, Monthly

**One-Time Snapshot:**
- [ ] Click "Create Snapshot"
- [ ] Name: `almanhaj-gateway-initial`
- [ ] Use for: Quick restore if needed

---

## 📝 Step 7: Get Your Credentials

### Gather These Before Deployment:

**Droplet Info:**
- [ ] Droplet IP: `___________` (copy from dashboard)
- [ ] Floating IP (if created): `___________`
- [ ] SSH Key: Already configured

**DigitalOcean Spaces (for audio storage):**
- [ ] Access Key: `DO801PDKTMXXJJ8LGXGW` (from .env.local)
- [ ] Secret Key: `4WAR+m7ZeS4Zby6ac+m23H0MhAj0yJGcmE8BmRkGUaA` (from .env.local)
- [ ] Bucket: `almanhaj-radio`
- [ ] Region: `lon1`
- [ ] Endpoint: `https://lon1.digitaloceanspaces.com`

**MongoDB Atlas (for database):**
- [ ] URI: From `.env.local`
- [ ] Database: `online-radio`

**Icecast (for streaming):**
- [ ] Mount point: `/stream`
- [ ] Source password: Will set during Linux setup

---

## ✅ Final Checklist Before Deployment

**In DigitalOcean Portal:**
- [ ] Droplet created and running
- [ ] IP address noted
- [ ] Firewall configured with all ports
- [ ] SSH key configured
- [ ] Monitoring enabled (optional)
- [ ] Backups enabled (optional)

**Ready for Local Deployment:**
- [ ] SSH can connect: `ssh -i ~/.ssh/id_rsa root@YOUR_DROPLET_IP`
- [ ] DigitalOcean Spaces credentials in `.env.local`
- [ ] MongoDB URI in `.env.local`
- [ ] Gateway code ready in `/gateway` folder

---

## 🎯 Quick Portal Summary

| Task | Time | Location | Notes |
|------|------|----------|-------|
| Create Droplet | 5 min | Create → Droplets | Write down IP |
| Create Firewall | 3 min | Networking → Firewalls | Add 5 inbound rules |
| Create Floating IP | 2 min | Networking → Floating IPs | Optional but recommended |
| Enable Monitoring | 2 min | Monitoring tab | Great for uptime tracking |
| Configure SSH | 2 min | Settings → SSH Keys | One-time setup |
| Enable Backups | 1 min | Backups tab | $1.20/mo extra |
| **Total** | **~15 min** | DigitalOcean Console | **Done!** |

---

## 📞 Support

**If you need help in DigitalOcean:**
- Support article: https://docs.digitalocean.com/products/compute/droplets/
- Community: https://www.digitalocean.com/community
- Status: https://status.digitalocean.com/

---

## 🚀 Ready to Deploy?

Once you complete this checklist, proceed to the deployment guide:
**`.kiro/DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md`**

This guide will walk you through SSH commands to set up the gateway service.

---

**Key DigitalOcean Settings for Reference:**
```
Droplet: almanhaj-gateway
Image: Ubuntu 22.04 LTS
Plan: $6/month (2GB RAM, 1 vCPU)
Firewall: almanhaj-gateway-firewall (ports 22, 80, 443, 8080, 8000)
Spaces: almanhaj-radio bucket (lon1 region)
Database: MongoDB Atlas (cloud-based)
Monitoring: Enabled with CPU/Memory alerts
Backups: Daily snapshots
```
