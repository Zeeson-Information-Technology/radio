# DigitalOcean Portal - Step-by-Step Visual Guide

This guide walks through every click in the DigitalOcean portal.

---

## ✅ What You'll Have When Done

- A running Droplet (Ubuntu Linux server in the cloud)
- Firewall configured to allow traffic
- Static IP address (optional but recommended)
- SSH key configured for secure access
- Ready to deploy the gateway

**Time:** ~15 minutes

---

## 🎯 STEP 1: Create a Droplet

### Navigate to Create Droplets Page

1. Log in to https://cloud.digitalocean.com
2. Click the **"Create"** button (top right)
3. Select **"Droplets"** from dropdown

### Configure Your Droplet

**Choose an OS Image:**
- Select tab: **"Distributions"**
- Choose: **"Ubuntu 22.04 LTS"** (or 24.04 LTS)
- *This is the operating system for your server*

**Choose a Plan:**
- Click: **"Basic"** plan type
- Select: **"$6/month"** option
- *2GB RAM, 1 vCPU is sufficient*
- Storage: 50GB SSD (plenty for audio processing)

**Choose a Region:**
- Select closest to your location
- Example: **"London (lon1)"** if in Europe
- *Reduces latency for listeners*

**VPC Network:** (Optional)
- Default is fine, can skip
- *Only needed if you have other DigitalOcean resources*

**Authentication:**
- Select: **"SSH key"** (recommended)
  - If no key yet: Click "New SSH Key"
  - Paste your public key from: `~/.ssh/id_rsa.pub`
  - Name it: `"My Machine"`
  - Click "Add SSH Key"
- Select your SSH key in the dropdown
- *SSH key is more secure than password*

**Droplet Name:**
- Type: `almanhaj-gateway`
- *Helps identify your Droplet in the dashboard*

**Backups:** (Optional)
- Check: **"Enable Backups"**
- Cost: +$1.20/month
- *Automatic daily backups of your server*

### Create the Droplet

1. Click the **"Create Droplet"** button
2. Wait 1-2 minutes for Droplet to start
3. When ready, you'll see a green status indicator

### Note Your IP Address

**Important:** Copy the **IP Address** shown in the Droplet list
- Example: `192.168.1.100`
- You'll need this to connect via SSH

---

## 🔒 STEP 2: Create a Firewall

### Navigate to Firewalls Page

1. Click **"Networking"** in left sidebar
2. Click **"Firewalls"** tab
3. Click **"Create Firewall"** button

### Configure Firewall Settings

**Name Your Firewall:**
- Type: `almanhaj-gateway-firewall`

**Inbound Rules** - This controls what traffic can reach your server

Click **"Add Rule"** and add these 5 rules:

| Rule # | Protocol | Source | Port | Purpose |
|--------|----------|--------|------|---------|
| 1 | SSH | Anywhere | 22 | Remote access to server |
| 2 | HTTP | Anywhere | 80 | Future web interface |
| 3 | HTTPS | Anywhere | 443 | Future encrypted web |
| 4 | TCP | Anywhere | 8080 | Gateway API & WebSocket |
| 5 | TCP | Anywhere | 8000 | Icecast audio stream |

**For each rule:**
1. Click "Add Rule"
2. Select Protocol: "TCP"
3. Specify Port: (see table above)
4. Source: "Anywhere" (0.0.0.0/0)
5. Description: (from Purpose column)
6. Click "Add Rule"

**Outbound Rules:**
- Keep default: "All outbound traffic allowed"
- *Allows server to connect to internet*

### Assign to Your Droplet

1. Scroll down to **"Assign to Droplets"**
2. Click the field and search: `almanhaj-gateway`
3. Select your Droplet
4. Click **"Create Firewall"** button

### Verify Firewall

You should see:
- ✅ Firewall created
- ✅ 5 inbound rules visible
- ✅ Assigned to your Droplet

---

## 🌐 STEP 3: Create a Floating IP (Optional but Recommended)

*Floating IPs give you a static address that won't change if the Droplet restarts*

### Navigate to Floating IPs

1. Click **"Networking"** in left sidebar
2. Click **"Floating IPs"** tab
3. Click **"Reserve a Floating IP"** button

### Configure Floating IP

**Select Droplet to Assign To:**
1. Click the dropdown
2. Search and select: `almanhaj-gateway`
3. Click **"Reserve"** button

### Note Your Floating IP

Copy the new IP address shown
- Example: `203.0.113.5`
- *Use this instead of the regular IP for more stability*

---

## 📊 STEP 4: Enable Monitoring (Optional)

*Monitoring helps track server health and alert you to problems*

### Navigate to Droplet Page

1. Click **"Droplets"** in left sidebar
2. Click your Droplet: `almanhaj-gateway`

### Enable Monitoring

1. Look for **"Monitoring"** section (or tab)
2. Click **"Enable Monitoring"**
3. You'll see options for:
   - CPU usage
   - Memory usage
   - Bandwidth
   - Requests

### Set Up Alerts (Optional)

1. Go to **"Alerts"** section
2. Create alerts for:
   - CPU > 80% for 5 minutes
   - Memory > 80% for 5 minutes
   - Offline: When Droplet unreachable
3. Alerts sent to your email

---

## 🔑 STEP 5: Add SSH Key (If Not Already Done)

*SSH keys are needed for secure access without passwords*

### If You Did This in Step 1: Skip This Section

### If You Need to Add SSH Key Now:

1. Click **"Settings"** in left sidebar
2. Click **"Security"** tab
3. Scroll to **"SSH Keys"**
4. Click **"Add SSH Key"** button

### Add Your SSH Key

1. Open terminal on your computer:
   ```bash
   cat ~/.ssh/id_rsa.pub
   ```
2. Copy the entire output
3. In DigitalOcean:
   - Paste into the text field
   - Name: `My Machine` (or your preference)
   - Click **"Add SSH Key"**

---

## 💾 STEP 6: Enable Automated Backups (Optional)

*Backups let you restore your server if something goes wrong*

### Navigate to Backups

1. Click **"Droplets"** in sidebar
2. Click your Droplet: `almanhaj-gateway`
3. Click **"Backups"** tab

### Enable Backups

**Automatic Backups:**
1. Scroll down to **"Snapshots"**
2. Click **"Enable Backups"**
3. Cost: +$1.20/month
4. Backups created: Daily

**Take Manual Snapshot (Optional):**
1. Click **"Take a Snapshot"**
2. Name: `almanhaj-gateway-initial`
3. Click **"Create Snapshot"**

---

## 📋 STEP 7: Get Your Credentials Ready

### In DigitalOcean Dashboard:

**Find Your Droplet Information:**
1. Click **"Droplets"** in sidebar
2. Click your Droplet: `almanhaj-gateway`
3. In the header section, note:
   - **Droplet IP**: e.g., `192.168.1.100`
   - **Floating IP** (if created): e.g., `203.0.113.5`
   - **Status**: Should show "Active" (green)

### Open Your Local `.env.local` File:

The credentials you need are already there:
- `MONGODB_URI` ✅ Already set
- `AWS_ACCESS_KEY_ID` ✅ Already set
- `AWS_SECRET_ACCESS_KEY` ✅ Already set
- `JWT_SECRET` ✅ Already set

You'll copy these to the Droplet `.env` file during deployment.

---

## ✅ Portal Setup Verification Checklist

**Go through each item:**

- [ ] Droplet created and running (shows "Active")
- [ ] Droplet IP address noted
- [ ] Firewall created with 5 rules
- [ ] Firewall assigned to Droplet
- [ ] SSH key configured
- [ ] Can ping Droplet: `ssh -i ~/.ssh/id_rsa root@YOUR_DROPLET_IP`
- [ ] Monitoring enabled (optional)
- [ ] Backups enabled (optional)
- [ ] Floating IP created (optional)

---

## 🚀 Ready for Next Phase?

Once you complete all the above:

1. ✅ Close DigitalOcean portal
2. ✅ Open terminal on your machine
3. ✅ Follow: `.kiro/DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md`

The deployment guide will walk you through SSH commands to set up the gateway service.

---

## 🎯 Quick Reference: Your Droplet Access

After setup, use this command to connect:

```bash
# Using regular Droplet IP:
ssh -i ~/.ssh/id_rsa root@YOUR_DROPLET_IP

# Using Floating IP (if created):
ssh -i ~/.ssh/id_rsa root@YOUR_FLOATING_IP

# Example:
ssh -i ~/.ssh/id_rsa root@192.168.1.100
```

---

## ⚠️ Common Mistakes to Avoid

1. ❌ Don't use password authentication (use SSH key)
2. ❌ Don't forget to note your IP address
3. ❌ Don't forget to add firewall rules
4. ❌ Don't select too small a plan ($3 won't work)
5. ❌ Don't create firewall but forget to assign it

---

## 🆘 Troubleshooting Portal Issues

### Issue: "Can't select SSH key"
**Solution:** First add SSH key in Settings → Security → SSH Keys

### Issue: "Droplet creation fails"
**Solution:** 
- Refresh page
- Try different region
- Check billing is active

### Issue: "Can't see Droplet in list"
**Solution:**
- Refresh the page
- Check if it's in a different region
- Wait a minute for creation to complete

### Issue: "Firewall rules not applied"
**Solution:**
- Make sure firewall is assigned to Droplet
- Click Droplet name to verify assignment
- May take 1-2 minutes to activate

---

## 🎉 You're Done with Portal Setup!

Next step: Follow the deployment guide to SSH into your Droplet and install the gateway.

**File:** `.kiro/DIGITALOCEAN_GATEWAY_DEPLOYMENT_GUIDE.md`

Good luck! 🚀
