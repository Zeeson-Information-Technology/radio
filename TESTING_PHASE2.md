# Testing Phase 2 - Quick Start Guide

This guide will help you quickly test the Phase 2 database integration.

## Prerequisites

Before testing, you need:
1. ✅ Node.js 18+ installed
2. ✅ MongoDB connection (Atlas or local)
3. ✅ `.env.local` file with `MONGODB_URI`

## Quick Setup (5 minutes)

### Step 1: Get MongoDB Connection String

**Option A: MongoDB Atlas (Recommended)**
1. Go to https://www.mongodb.com/cloud/atlas
2. Create a free account and cluster
3. Create a database user
4. Whitelist your IP (or use 0.0.0.0/0 for dev)
5. Get connection string from "Connect" → "Connect your application"

**Option B: Local MongoDB**
```bash
# If you have MongoDB installed locally
MONGODB_URI=mongodb://localhost:27017/online-radio
```

### Step 2: Configure Environment

Edit `online-radio/.env.local`:

```env
# Replace with your actual connection string
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/online-radio?retryWrites=true&w=majority

# Other variables (keep as-is for now)
JWT_SECRET=your_jwt_secret_here_change_in_production
STREAM_URL=https://example.com/stream
STREAM_HOST=example.com
STREAM_PORT=8000
STREAM_MOUNT=/stream
STREAM_PASSWORD=your_stream_password_here
```

### Step 3: Start the Server

```bash
cd online-radio
npm run dev
```

Wait for the server to start (you'll see "Ready" in the terminal).

### Step 4: Test the Database Connection

Open your browser and visit:

```
http://localhost:3000/api/db-test
```

## Expected Results

### ✅ Success Response

You should see JSON like this:

```json
{
  "ok": true,
  "message": "Database connection successful",
  "liveState": {
    "id": "675506a1234567890abcdef0",
    "isLive": false,
    "mount": "/stream",
    "title": "Initial state",
    "lecturer": null,
    "startedAt": null,
    "updatedAt": "2025-12-08T00:05:23.456Z"
  }
}
```

This means:
- ✅ MongoDB connection is working
- ✅ Database and collection were created
- ✅ LiveState model is functioning
- ✅ A default LiveState document was created

### ❌ Error Responses

**"MONGODB_URI is not defined"**
```json
{
  "ok": false,
  "error": "MONGODB_URI is not defined in environment variables..."
}
```
**Fix:** Add `MONGODB_URI` to `.env.local` and restart the server.

**"Connection timeout" or "Failed to connect"**
```json
{
  "ok": false,
  "error": "connect ETIMEDOUT..."
}
```
**Fix:** 
- Check your MongoDB Atlas IP whitelist
- Verify your connection string is correct
- Make sure MongoDB service is running (if local)

**"Authentication failed"**
```json
{
  "ok": false,
  "error": "Authentication failed"
}
```
**Fix:** Check your database username and password in the connection string.

## Verify in MongoDB

### MongoDB Atlas
1. Go to your Atlas dashboard
2. Click "Browse Collections"
3. You should see:
   - Database: `online-radio` (or your database name)
   - Collection: `livestates`
   - 1 document with `isLive: false`

### MongoDB Compass (Local)
1. Open MongoDB Compass
2. Connect to your database
3. Browse to `online-radio` → `livestates`
4. You should see 1 document

### Command Line (mongosh)
```bash
# Connect
mongosh "your-connection-string"

# List databases
show dbs

# Use your database
use online-radio

# View collections
show collections

# View LiveState document
db.livestates.find().pretty()
```

## Testing the Models

You can test each model by creating test documents. Here are some examples:

### Test AdminUser Model

Create a file `online-radio/scripts/test-models.ts` (optional):

```typescript
import { connectDB } from "@/lib/db";
import { AdminUser, LiveState, Schedule, Episode } from "@/lib/models";

async function testModels() {
  await connectDB();

  // Test AdminUser
  const admin = await AdminUser.create({
    email: "admin@example.com",
    passwordHash: "hashed_password_here",
    role: "admin",
  });
  console.log("Created admin:", admin);

  // Test Schedule
  const schedule = await Schedule.create({
    dayOfWeek: 5, // Friday
    startTime: "20:00",
    durationMinutes: 60,
    lecturer: "Sheikh Ahmad",
    topic: "Tafsir of Surah Al-Baqarah",
  });
  console.log("Created schedule:", schedule);

  // Test Episode
  const episode = await Episode.create({
    title: "Introduction to Tafsir",
    lecturer: "Sheikh Ahmad",
    storageKey: "recordings/2025-12-07-intro.mp3",
    tags: ["tafsir", "quran"],
  });
  console.log("Created episode:", episode);
}

testModels();
```

## What's Working Now

After Phase 2, you have:

✅ **Database Connection**
- Cached connection helper
- Works with Next.js hot-reload
- Proper error handling

✅ **Four Core Models**
- AdminUser (for authentication in Phase 3)
- LiveState (current stream status)
- Schedule (planned lectures)
- Episode (recorded content)

✅ **Test Endpoint**
- `/api/db-test` to verify everything works

## What's NOT Working Yet

❌ **Authentication** - Coming in Phase 3
- No login functionality
- No password hashing
- No JWT tokens
- Admin pages are not protected

❌ **Live Stream Control** - Coming in Phase 4
- Can't start/stop live stream from UI
- Radio page doesn't fetch real data
- Admin dashboard doesn't update LiveState

❌ **Streaming Server** - Coming in Phase 5
- No actual audio streaming
- Placeholder URLs only

## Next Steps

Once you've verified Phase 2 is working:

1. ✅ Confirm `/api/db-test` returns success
2. ✅ Check MongoDB to see the created document
3. 🔜 Move to Phase 3 (Authentication)
4. 🔜 Implement admin login
5. 🔜 Protect admin routes
6. 🔜 Build live stream control API

## Troubleshooting

### Server won't start
```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### TypeScript errors
```bash
# Check for compilation errors
npm run build
```

### Can't connect to MongoDB
1. Check `.env.local` exists and has `MONGODB_URI`
2. Restart the dev server after adding env variables
3. Test connection string with MongoDB Compass
4. Check Atlas IP whitelist (if using Atlas)

### "Cannot overwrite model" error
```bash
# Restart the dev server
# This should be rare due to our export pattern
```

## Need Help?

See detailed guides:
- [DATABASE_SETUP.md](DATABASE_SETUP.md) - Complete MongoDB setup guide
- [PHASE2_COMPLETE.md](PHASE2_COMPLETE.md) - Full Phase 2 documentation
- [README.md](README.md) - Project overview

## Quick Commands Reference

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Check for TypeScript errors
npm run build

# Lint code
npm run lint
```

## Success Checklist

Before moving to Phase 3, verify:

- [ ] `/api/db-test` returns `"ok": true`
- [ ] MongoDB shows `online-radio` database
- [ ] `livestates` collection has 1 document
- [ ] No TypeScript errors (`npm run build` succeeds)
- [ ] Dev server starts without errors
- [ ] You understand the four models (AdminUser, LiveState, Schedule, Episode)

If all checkboxes are checked, you're ready for Phase 3! 🎉
