# Listener Tracking - How It Works

## Overview

Al-Manhaj Radio now tracks how many people are listening to your live broadcasts in real-time. This feature provides valuable insights for admins and presenters.

## How Listener Counting Works

### Method 1: Icecast Server Statistics (Recommended)

When you have an Icecast streaming server set up, it automatically tracks connected listeners.

**How it works:**
1. Each time someone plays the stream, they connect to Icecast
2. Icecast maintains a count of active connections
3. Our app fetches this count from Icecast's stats API
4. The count updates every 10 seconds automatically

**Icecast Stats Endpoint:**
```
https://your-radio-domain.com/status-json.xsl
```

This endpoint returns JSON with listener information:
```json
{
  "icestats": {
    "source": {
      "listeners": 15,
      "listener_peak": 23,
      "server_name": "Al-Manhaj Radio",
      ...
    }
  }
}
```

### Method 2: Fallback (When Icecast Not Available)

If Icecast stats aren't available, the app shows `0` listeners. This happens when:
- Stream URL not configured
- Icecast stats endpoint not accessible
- Network issues

## Features Implemented

### 1. API Endpoint: `/api/listeners`

**Purpose:** Fetch current listener count from Icecast

**Response:**
```json
{
  "ok": true,
  "listeners": 15,
  "configured": true,
  "source": "icecast",
  "timestamp": "2025-12-08T10:30:00.000Z"
}
```

**Features:**
- 5-second timeout to prevent hanging
- Graceful error handling
- Returns 0 if stats unavailable
- Indicates if stream is configured

### 2. Admin Live Page Display

**Two places showing listener count:**

#### A. Status Card (When Live)
- Shows next to "Started" time
- Updates every 10 seconds
- Icon: 👥 (people icon)
- Format: "Listeners: **15**"

#### B. Sidebar Statistics Card (When Live)
- Large, prominent display
- Purple gradient background
- Shows count in big numbers
- Manual refresh button
- Auto-updates every 10 seconds

**Visual Example:**
```
┌─────────────────────────┐
│ 👥 Live Listeners    🔄 │
├─────────────────────────┤
│                         │
│         15              │
│                         │
│   people listening      │
│                         │
│ Updates every 10 seconds│
└─────────────────────────┘
```

### 3. Auto-Refresh

**Polling Mechanism:**
- Starts when broadcast goes live
- Fetches count every 10 seconds
- Stops when broadcast ends
- Minimal server load

**Implementation:**
```typescript
useEffect(() => {
  fetchListenerCount();
  
  const interval = setInterval(() => {
    if (liveState.isLive) {
      fetchListenerCount();
    }
  }, 10000); // 10 seconds
  
  return () => clearInterval(interval);
}, [liveState.isLive]);
```

## Setup Requirements

### For Listener Tracking to Work:

1. **Icecast Server Must Be Running**
   - Follow `ICECAST_SETUP.md`
   - Ensure Icecast is accessible

2. **Stats Endpoint Must Be Enabled**
   - Icecast enables this by default
   - Accessible at: `https://your-domain.com/status-json.xsl`

3. **CORS May Need Configuration**
   - If stats endpoint is on different domain
   - Add CORS headers in Icecast config

### Icecast Configuration

In `/etc/icecast2/icecast.xml`:

```xml
<icecast>
  <!-- Enable stats -->
  <paths>
    <webroot>/usr/share/icecast2/web</webroot>
    <adminroot>/usr/share/icecast2/admin</adminroot>
  </paths>
  
  <!-- Stats are enabled by default -->
  <!-- Access at: http://your-server:8000/status-json.xsl -->
</icecast>
```

## Testing Listener Count

### Test 1: Check Stats Endpoint

```bash
# Direct access to Icecast stats
curl https://your-radio-domain.com/status-json.xsl

# Should return JSON with listener count
```

### Test 2: Check API Endpoint

```bash
# Test your app's listener API
curl http://localhost:3000/api/listeners

# Expected response:
{
  "ok": true,
  "listeners": 0,
  "configured": true,
  "source": "icecast"
}
```

### Test 3: Simulate Listeners

1. Open `/radio` page in multiple browsers/tabs
2. Click play on each
3. Check admin panel - count should increase
4. Close tabs - count should decrease

### Test 4: Admin Panel Display

1. Login as admin
2. Go to `/admin/live`
3. Start a broadcast
4. Look for:
   - Listener count in status card
   - Purple "Live Listeners" card in sidebar
5. Open `/radio` in another tab
6. Count should increase to 1

## Troubleshooting

### Listener Count Shows 0

**Possible Causes:**

1. **Stream Not Configured**
   - Check `.env.local` has correct `STREAM_URL`
   - Verify URL is not `example.com`

2. **Icecast Not Running**
   ```bash
   sudo systemctl status icecast2
   # Should show "active (running)"
   ```

3. **Stats Endpoint Not Accessible**
   ```bash
   curl https://your-domain.com/status-json.xsl
   # Should return JSON, not 404
   ```

4. **CORS Issues**
   - Check browser console for CORS errors
   - May need to configure Icecast CORS headers

5. **Network/Firewall Issues**
   - Ensure port 8000 (or your Icecast port) is open
   - Check firewall rules

### Count Not Updating

**Solutions:**

1. **Check Browser Console**
   - Look for JavaScript errors
   - Check network tab for failed requests

2. **Verify Polling**
   - Should see requests to `/api/listeners` every 10 seconds
   - Only when broadcast is live

3. **Manual Refresh**
   - Click refresh button (🔄) in sidebar card
   - Should fetch latest count immediately

### Count Seems Inaccurate

**Understanding Icecast Counting:**

- Icecast counts **active connections**
- A listener who pauses still counts (connection open)
- Count decreases when:
  - Browser tab closed
  - Page refreshed
  - Connection timeout (usually 30 seconds)

**Normal Behavior:**
- Count may lag by a few seconds
- Paused listeners still count
- Mobile apps may maintain connection when backgrounded

## Advanced: Custom Listener Tracking

If you want more detailed analytics (not included by default):

### Option 1: Database Tracking

Track each listener session in MongoDB:

```typescript
// Create Listener model
interface IListener {
  sessionId: string;
  ipAddress: string;
  userAgent: string;
  connectedAt: Date;
  disconnectedAt: Date | null;
  duration: number;
}

// Track on play
POST /api/listeners/connect

// Track on stop
POST /api/listeners/disconnect
```

### Option 2: Analytics Integration

Integrate with analytics services:
- Google Analytics
- Mixpanel
- Custom analytics dashboard

### Option 3: Icecast Logs

Parse Icecast access logs for detailed stats:
```bash
tail -f /var/log/icecast2/access.log
```

## Privacy Considerations

**Current Implementation:**
- ✅ Only counts total listeners
- ✅ No personal data collected
- ✅ No IP addresses stored
- ✅ No tracking cookies
- ✅ Anonymous counting

**If Adding Custom Tracking:**
- ⚠️ Inform users about data collection
- ⚠️ Comply with privacy laws (GDPR, etc.)
- ⚠️ Provide opt-out mechanism
- ⚠️ Secure any stored data

## Performance Impact

**Minimal Impact:**
- API call every 10 seconds (only when live)
- Lightweight JSON response
- No database queries
- Cached by Icecast

**Optimization:**
- Polling only when broadcast is active
- 5-second timeout prevents hanging
- Graceful degradation if stats unavailable

## Future Enhancements

Potential features to add:

1. **Peak Listener Count**
   - Track highest concurrent listeners
   - Show in admin dashboard

2. **Listener History**
   - Graph of listeners over time
   - Historical data storage

3. **Geographic Distribution**
   - Show where listeners are from
   - Requires IP geolocation

4. **Listening Duration**
   - Average time per listener
   - Engagement metrics

5. **Real-time Notifications**
   - Alert when listener count reaches milestone
   - Push notifications to admin

6. **Public Stats**
   - Show listener count on public radio page
   - "X people listening now"

## Summary

**What Works Now:**
- ✅ Real-time listener count from Icecast
- ✅ Auto-refresh every 10 seconds
- ✅ Display in admin panel (2 locations)
- ✅ Manual refresh button
- ✅ Graceful error handling

**Requirements:**
- Icecast server running
- Stats endpoint accessible
- Stream properly configured

**Next Steps:**
1. Set up Icecast server (if not done)
2. Test stats endpoint
3. Start broadcast
4. Open `/radio` in multiple tabs
5. Watch count increase in admin panel!

---

**Note:** Listener tracking only works with a real Icecast server. During development with placeholder URLs, it will show 0 listeners.
