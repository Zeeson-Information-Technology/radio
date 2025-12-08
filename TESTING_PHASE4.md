# Testing Phase 4 - Live State API & Real-Time Integration

## Quick Start Testing Guide

### Prerequisites

1. ✅ MongoDB connected (from Phase 2)
2. ✅ Super admin created (from Phase 3)
3. ✅ `.env.local` configured with:
   ```env
   MONGODB_URI=your-mongodb-connection-string
   JWT_SECRET=your-jwt-secret
   SUPER_ADMIN_PASSWORD=your-password
   STREAM_URL=https://example.com/stream  # Optional, has fallback
   ```

### Start Development Server

```bash
cd online-radio
npm run dev
```

Open http://localhost:3000

---

## Test Scenarios

### ✅ Test 1: Public Radio Page (Offline State)

**Steps:**
1. Visit http://localhost:3000/radio
2. Observe the page

**Expected Results:**
- ✅ Page loads without errors
- ✅ Shows "OFFLINE - Playing Recordings" badge (gray)
- ✅ Shows title (likely "Offline" or previous session)
- ✅ Shows audio player with play button
- ✅ In dev mode, shows stream URL at bottom
- ✅ Message: "Currently playing recorded content..."

**Screenshot Checklist:**
- [ ] Gray offline badge visible
- [ ] Audio player controls visible
- [ ] No errors in browser console

---

### ✅ Test 2: Admin Login

**Steps:**
1. Visit http://localhost:3000/admin/login
2. Enter credentials:
   - Email: `ibrahim.saliman.zainab@gmail.com`
   - Password: Your `SUPER_ADMIN_PASSWORD`
3. Click "Login"

**Expected Results:**
- ✅ Redirects to `/admin/live`
- ✅ Shows "Live Stream Control" page
- ✅ Shows "Logged in as: ibrahim.saliman.zainab@gmail.com • admin"
- ✅ Shows current status: "OFFLINE"
- ✅ Shows "Go Live" button (green)
- ✅ Shows navigation buttons: "Manage Users", "Change Password", "Logout"

**Screenshot Checklist:**
- [ ] Successfully logged in
- [ ] Admin panel visible
- [ ] Current status shows "OFFLINE"

---

### ✅ Test 3: Start Live Stream

**Steps:**
1. On `/admin/live` page (while logged in)
2. Fill in the form:
   - **Lecture Title:** "Tafsir of Surah Al-Baqarah"
   - **Lecturer Name:** "Sheikh Ahmad"
3. Click "Go Live" button

**Expected Results:**
- ✅ Button shows "Starting..." briefly
- ✅ Success message appears: "Live stream started successfully!"
- ✅ Current status updates to "LIVE" with red animated badge
- ✅ Shows:
  - Title: "Tafsir of Surah Al-Baqarah"
  - Lecturer: "Sheikh Ahmad"
  - Started: "Just started" or "X minutes ago"
- ✅ Button changes to "Stop Live" (red)

**Screenshot Checklist:**
- [ ] Success message visible
- [ ] Status shows "LIVE" with red badge
- [ ] Title and lecturer displayed correctly
- [ ] "Stop Live" button visible

---

### ✅ Test 4: Verify Public Page Shows Live

**Steps:**
1. Open a new tab or window
2. Visit http://localhost:3000/radio
3. Observe the changes

**Expected Results:**
- ✅ Shows "LIVE NOW" badge (red with pulsing dot)
- ✅ Shows title: "Tafsir of Surah Al-Baqarah"
- ✅ Shows lecturer: "by Sheikh Ahmad"
- ✅ Shows time: "Started X minutes ago"
- ✅ Message: "You are listening to a live lecture..."
- ✅ Auto-refresh message: "Status updates automatically every 30 seconds"

**Screenshot Checklist:**
- [ ] Red "LIVE NOW" badge with animation
- [ ] Correct title and lecturer
- [ ] Time display working

---

### ✅ Test 5: Auto-Refresh (30 Second Poll)

**Steps:**
1. Keep the public radio page open
2. Wait 30 seconds
3. Check browser Network tab (F12 → Network)

**Expected Results:**
- ✅ Every 30 seconds, see a new request to `/api/live`
- ✅ Status code: 200
- ✅ Response contains current live state
- ✅ Page updates without full reload

**Screenshot Checklist:**
- [ ] Network requests showing periodic `/api/live` calls
- [ ] No errors in console

---

### ✅ Test 6: Stop Live Stream

**Steps:**
1. Go back to admin panel tab
2. Click "Stop Live" button

**Expected Results:**
- ✅ Button shows "Stopping..." briefly
- ✅ Success message: "Live stream stopped successfully!"
- ✅ Status changes to "OFFLINE"
- ✅ Started time shows: "Not started"
- ✅ Button changes back to "Go Live" (green)

**Screenshot Checklist:**
- [ ] Success message visible
- [ ] Status shows "OFFLINE"
- [ ] "Go Live" button visible

---

### ✅ Test 7: Verify Public Page Shows Offline

**Steps:**
1. Switch to public radio page tab
2. Wait up to 30 seconds for auto-refresh (or manually refresh)

**Expected Results:**
- ✅ Badge changes to "OFFLINE - Playing Recordings" (gray)
- ✅ Title may still show last session title
- ✅ Message: "Currently playing recorded content..."

**Screenshot Checklist:**
- [ ] Gray offline badge
- [ ] Appropriate offline message

---

### ✅ Test 8: Quick Actions

**Steps:**
1. On admin panel, click "View Public Radio Page"
2. Click "Refresh Status"

**Expected Results:**
- ✅ "View Public Radio Page" opens `/radio` in new tab
- ✅ "Refresh Status" fetches latest state immediately
- ✅ Status updates without page reload

---

### ✅ Test 9: Presenter Role (If Available)

**Steps:**
1. Create a presenter account (if admin):
   - Go to `/admin/presenters`
   - Click "Add Presenter"
   - Enter email: `presenter@example.com`
   - Copy temporary password
2. Logout
3. Login as presenter
4. Try starting/stopping live stream

**Expected Results:**
- ✅ Presenter can access `/admin/live`
- ✅ Presenter can start live stream
- ✅ Presenter can stop live stream
- ✅ Presenter CANNOT see "Manage Users" button
- ✅ Presenter CAN see "Change Password" button

---

### ✅ Test 10: API Testing with curl

**Test GET /api/live (Public):**
```bash
curl http://localhost:3000/api/live
```

**Expected Response:**
```json
{
  "ok": true,
  "isLive": false,
  "title": "Offline",
  "lecturer": null,
  "startedAt": null,
  "streamUrl": "https://example.com/stream"
}
```

**Test POST /api/admin/live/start (Protected):**
```bash
# First login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"ibrahim.saliman.zainab@gmail.com","password":"YOUR_PASSWORD"}' \
  -c cookies.txt

# Then start live
curl -X POST http://localhost:3000/api/admin/live/start \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Lecture","lecturer":"Test Sheikh"}' \
  -b cookies.txt
```

**Expected Response:**
```json
{
  "ok": true,
  "isLive": true,
  "message": "Live stream started successfully",
  "liveState": {
    "isLive": true,
    "title": "Test Lecture",
    "lecturer": "Test Sheikh",
    "startedAt": "2025-12-08T...",
    "mount": "/stream"
  }
}
```

**Test POST /api/admin/live/stop:**
```bash
curl -X POST http://localhost:3000/api/admin/live/stop \
  -b cookies.txt
```

---

## Common Issues & Solutions

### Issue: "Service Unavailable" on /radio

**Symptoms:**
- Radio page shows error
- API returns 500 status

**Solutions:**
1. Check MongoDB connection:
   ```bash
   # Test DB connection
   curl http://localhost:3000/api/db-test
   ```
2. Verify `MONGODB_URI` in `.env.local`
3. Check server console for errors
4. Restart dev server

---

### Issue: Live state not updating on public page

**Symptoms:**
- Admin panel shows "LIVE"
- Public page still shows "OFFLINE"

**Solutions:**
1. Wait 30 seconds for auto-refresh
2. Manually refresh the page (F5)
3. Check browser console for errors
4. Verify `/api/live` returns correct data:
   ```bash
   curl http://localhost:3000/api/live
   ```

---

### Issue: "Not authenticated" when starting live

**Symptoms:**
- Click "Go Live" → Error: "Not authenticated"

**Solutions:**
1. Check if logged in (see email in header)
2. Check browser cookies for `admin_token`
3. Try logging out and back in
4. Verify `JWT_SECRET` is set in `.env.local`
5. Check token expiry (7 days)

---

### Issue: Audio player not working

**Symptoms:**
- Click play → Nothing happens
- Audio error in console

**Solutions:**
- **This is expected in Phase 4!**
- `STREAM_URL` is a placeholder
- Real audio streaming will work in Phase 5
- For now, just verify the URL is displayed correctly

---

### Issue: TypeScript errors

**Symptoms:**
- Red squiggly lines in VS Code
- Build fails

**Solutions:**
1. Run diagnostics:
   ```bash
   npm run build
   ```
2. Check for missing imports
3. Verify all types are correct
4. Restart TypeScript server in VS Code

---

## Database Verification

### Check LiveState Document

**Using MongoDB Compass or Atlas:**
1. Connect to your database
2. Navigate to `online-radio` database
3. Open `livestates` collection
4. Should see one document with:
   - `isLive`: true/false
   - `title`: string
   - `lecturer`: string
   - `startedAt`: date or null
   - `mount`: "/stream"

**Using MongoDB Shell:**
```javascript
use online-radio
db.livestates.find().pretty()
```

---

## Performance Testing

### Test Auto-Refresh Performance

**Steps:**
1. Open browser DevTools (F12)
2. Go to Network tab
3. Keep radio page open for 5 minutes
4. Observe requests

**Expected:**
- ✅ Request to `/api/live` every 30 seconds
- ✅ Each request < 100ms response time
- ✅ No memory leaks
- ✅ No duplicate requests

---

## Security Testing

### Test Authentication

**Test 1: Access protected endpoint without auth**
```bash
curl -X POST http://localhost:3000/api/admin/live/start \
  -H "Content-Type: application/json" \
  -d '{"title":"Test"}'
```

**Expected:** 401 Unauthorized

**Test 2: Access with invalid token**
```bash
curl -X POST http://localhost:3000/api/admin/live/start \
  -H "Content-Type: application/json" \
  -H "Cookie: admin_token=invalid_token" \
  -d '{"title":"Test"}'
```

**Expected:** 401 Unauthorized

**Test 3: Public endpoint accessible**
```bash
curl http://localhost:3000/api/live
```

**Expected:** 200 OK with data

---

## Success Criteria

Phase 4 is complete when:

- ✅ Public radio page fetches real live state
- ✅ Admin can start live stream with title and lecturer
- ✅ Admin can stop live stream
- ✅ Public page shows live badge when stream is live
- ✅ Public page auto-refreshes every 30 seconds
- ✅ Presenter role can control live stream
- ✅ All API endpoints return correct responses
- ✅ No TypeScript errors
- ✅ No console errors
- ✅ Authentication works correctly
- ✅ Database updates correctly

---

## Next Steps

After successful testing:

1. ✅ Phase 4 is complete
2. 🚀 Ready for Phase 5: Icecast server setup
3. 📝 Document any issues found
4. 🎉 Celebrate working live state management!

---

## Test Results Template

Copy this template to document your testing:

```
# Phase 4 Test Results

Date: ___________
Tester: ___________

## Test Results

- [ ] Test 1: Public Radio Page (Offline) - PASS/FAIL
- [ ] Test 2: Admin Login - PASS/FAIL
- [ ] Test 3: Start Live Stream - PASS/FAIL
- [ ] Test 4: Public Page Shows Live - PASS/FAIL
- [ ] Test 5: Auto-Refresh - PASS/FAIL
- [ ] Test 6: Stop Live Stream - PASS/FAIL
- [ ] Test 7: Public Page Shows Offline - PASS/FAIL
- [ ] Test 8: Quick Actions - PASS/FAIL
- [ ] Test 9: Presenter Role - PASS/FAIL
- [ ] Test 10: API Testing - PASS/FAIL

## Issues Found

1. ___________
2. ___________

## Notes

___________
```

---

## Support

If you encounter issues:

1. Check this testing guide
2. Review `PHASE4_COMPLETE.md`
3. Check server console logs
4. Check browser console logs
5. Verify environment variables
6. Test API endpoints directly with curl

Happy testing! 🎙️
