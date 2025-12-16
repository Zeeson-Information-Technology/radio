# EC2 Server Update Playbook

This document provides step-by-step instructions for updating the Al-Manhaj Radio system on the EC2 server via SSH.

## Prerequisites

- SSH access to EC2 server
- Private key file (`radio-key.pem`) in Downloads folder
- Git repository access
- Basic Linux command knowledge

## 1. Connect to EC2 Server

```bash
# Navigate to Downloads folder (where radio-key.pem is located)
cd ~/Downloads

# Connect to EC2 server
ssh -i radio-key.pem ubuntu@98.93.42.61
```

## 2. Navigate to Project Directory

```bash
# Go to the repository directory
cd /opt/almanhaj-gateway-repo

# Check current status
pwd
git status
git branch
```

## 3. Pull Latest Changes

```bash
# Fetch and pull latest changes from main branch
git fetch origin
git pull origin main

# Check what changed
git log --oneline -5
```

## 4. Update Gateway Server

```bash
# Copy updated server.js to deployment directory
sudo cp gateway/server.js /opt/almanhaj-gateway/server.js

# Verify the file was copied
ls -la /opt/almanhaj-gateway/server.js

# Check file size to ensure it's the updated version
wc -l /opt/almanhaj-gateway/server.js
```

## 5. Restart Services

### Restart Gateway Service
```bash
# Restart the gateway service
sudo systemctl restart almanhaj-gateway

# Check service status
sudo systemctl status almanhaj-gateway

# Check recent logs
sudo journalctl -u almanhaj-gateway --since "1 minute ago" --no-pager
```

### Check Icecast Service (if needed)
```bash
# Check Icecast status
sudo systemctl status icecast2

# Restart Icecast if needed
sudo systemctl restart icecast2

# Check if port 8000 is listening
sudo ss -tlnp | grep :8000
```

## 6. Verify System Health

### Check Gateway Health
```bash
# Test gateway health endpoint
curl -s http://localhost:8080/health | python3 -m json.tool

# Check if gateway is listening on port 8080
sudo ss -tlnp | grep :8080
```

### Check Icecast Status
```bash
# Check Icecast main page
curl -s http://localhost:8000/

# Check for active streams (may require auth)
curl -s http://localhost:8000/admin/stats.xml
```

### Monitor Logs
```bash
# Monitor gateway logs in real-time
sudo journalctl -u almanhaj-gateway -f

# Check Icecast logs
sudo tail -f /var/log/icecast2/error.log
sudo tail -f /var/log/icecast2/access.log
```

## 7. Test Broadcasting

### Start a Test Broadcast
1. Go to admin panel: `https://almanhaj.vercel.app/admin/live`
2. Click "Start Broadcasting"
3. Monitor logs for connection status

### Check Stream Availability
```bash
# Check if stream mount is active
curl -I http://localhost:8000/stream

# Monitor FFmpeg connections
ps aux | grep ffmpeg

# Check gateway logs for streaming activity
sudo journalctl -u almanhaj-gateway --since "2 minutes ago" --no-pager | grep -i stream
```

## 8. Troubleshooting

### Gateway Issues
```bash
# If gateway fails to start, check logs
sudo journalctl -u almanhaj-gateway --since "5 minutes ago" --no-pager

# Check for syntax errors
node -c /opt/almanhaj-gateway/server.js

# Check environment variables
sudo cat /opt/almanhaj-gateway/.env
```

### Icecast Issues
```bash
# Check Icecast configuration
sudo cat /etc/icecast2/icecast.xml | grep -A5 -B5 source-password

# Check Icecast permissions
sudo ls -la /var/log/icecast2/

# Restart Icecast with verbose logging
sudo systemctl stop icecast2
sudo icecast2 -c /etc/icecast2/icecast.xml
```

### Network Issues
```bash
# Check firewall status
sudo ufw status

# Check network connections
sudo netstat -tlnp | grep -E ':(8000|8080)'

# Test external connectivity
curl -I https://almanhaj.duckdns.org/stream
```

## 9. Common Update Scenarios

### Code Changes Only
```bash
cd /opt/almanhaj-gateway-repo
git pull origin main
sudo cp gateway/server.js /opt/almanhaj-gateway/server.js
sudo systemctl restart almanhaj-gateway
```

### Configuration Changes
```bash
# Update environment variables if needed
sudo nano /opt/almanhaj-gateway/.env

# Restart services
sudo systemctl restart almanhaj-gateway
sudo systemctl restart icecast2
```

### Dependency Updates
```bash
cd /opt/almanhaj-gateway-repo
git pull origin main

# If package.json changed, update dependencies
cd /opt/almanhaj-gateway
sudo npm install

# Copy updated files
sudo cp /opt/almanhaj-gateway-repo/gateway/server.js .
sudo systemctl restart almanhaj-gateway
```

## 10. Rollback Procedure

### If Update Fails
```bash
# Check git history
cd /opt/almanhaj-gateway-repo
git log --oneline -10

# Rollback to previous version
git checkout <previous-commit-hash>
sudo cp gateway/server.js /opt/almanhaj-gateway/server.js
sudo systemctl restart almanhaj-gateway

# Verify rollback worked
sudo systemctl status almanhaj-gateway
```

### Emergency Restore
```bash
# If system is completely broken, restore from backup
sudo systemctl stop almanhaj-gateway

# Restore previous working server.js (if you have backup)
sudo cp /opt/almanhaj-gateway/server.js.backup /opt/almanhaj-gateway/server.js

# Start service
sudo systemctl start almanhaj-gateway
```

## 11. Post-Update Verification

### Functional Tests
1. **Admin Panel**: Can log in and access live controls
2. **Broadcasting**: Can start/stop broadcasts successfully
3. **Mute System**: Mute/unmute functionality works
4. **Listener Page**: Real-time updates work properly
5. **Audio Stream**: Stream is accessible and plays audio

### Performance Checks
```bash
# Check system resources
htop
df -h
free -h

# Monitor service performance
sudo systemctl status almanhaj-gateway
sudo systemctl status icecast2
```

## 12. Maintenance Notes

### Regular Maintenance
- Update system packages monthly: `sudo apt update && sudo apt upgrade`
- Check disk space regularly: `df -h`
- Monitor log file sizes: `sudo du -sh /var/log/*`
- Backup configuration files before major updates

### Security Updates
- Keep SSH keys secure
- Update system packages regularly
- Monitor access logs for suspicious activity
- Review firewall rules periodically

---

## Quick Reference Commands

```bash
# Connect to server
ssh -i ~/Downloads/radio-key.pem ubuntu@98.93.42.61

# Update code
cd /opt/almanhaj-gateway-repo && git pull origin main

# Deploy changes
sudo cp gateway/server.js /opt/almanhaj-gateway/server.js

# Restart service
sudo systemctl restart almanhaj-gateway

# Check status
sudo systemctl status almanhaj-gateway

# Monitor logs
sudo journalctl -u almanhaj-gateway -f
```

---

**Last Updated**: December 16, 2025
**Version**: 1.0
**Maintainer**: Development Team