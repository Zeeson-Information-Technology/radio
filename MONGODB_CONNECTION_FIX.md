# MongoDB Connection String Fix

## Issue

Your current connection string is:
```
mongodb+srv://radio_user:okBJKJbtUS2KCTLE@cluster.mongodb.net/online-radio?retryWrites=true&w=majority
```

The error `querySrv ENOTFOUND _mongodb._tcp.cluster.mongodb.net` means the hostname `cluster.mongodb.net` is not valid.

## Solution

You need to get the **correct cluster hostname** from MongoDB Atlas.

### Step 1: Get Your Correct Connection String

1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Log in to your account
3. Click on your cluster (usually named "Cluster0" or similar)
4. Click the **"Connect"** button
5. Choose **"Connect your application"**
6. Select **"Node.js"** as the driver
7. Copy the connection string - it should look like:
   ```
   mongodb+srv://radio_user:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   
   Notice the format: `cluster0.xxxxx.mongodb.net` where `xxxxx` is a unique identifier for your cluster.

### Step 2: Update Your .env.local

Replace the `MONGODB_URI` in your `.env.local` file with the correct connection string:

```env
# Replace <password> with your actual password: okBJKJbtUS2KCTLE
# Add the database name after .net/: online-radio
MONGODB_URI=mongodb+srv://radio_user:okBJKJbtUS2KCTLE@cluster0.xxxxx.mongodb.net/online-radio?retryWrites=true&w=majority
```

**Important:** 
- Replace `cluster0.xxxxx.mongodb.net` with your actual cluster hostname from Atlas
- Keep your password: `okBJKJbtUS2KCTLE`
- Keep the database name: `online-radio`

### Step 3: Restart the Dev Server

After updating `.env.local`:

1. Stop the current server (Ctrl+C in the terminal)
2. Start it again:
   ```bash
   npm run dev
   ```

### Step 4: Test Again

Visit: http://localhost:3000/api/db-test

You should see:
```json
{
  "ok": true,
  "message": "Database connection successful",
  "liveState": { ... }
}
```

## Example of Correct Connection Strings

Here are examples of what valid MongoDB Atlas connection strings look like:

```
mongodb+srv://user:pass@cluster0.abc123.mongodb.net/dbname?retryWrites=true&w=majority
mongodb+srv://user:pass@mycluster.xyz789.mongodb.net/dbname?retryWrites=true&w=majority
mongodb+srv://user:pass@production.def456.mongodb.net/dbname?retryWrites=true&w=majority
```

The key part is the cluster hostname format: `clusterName.uniqueId.mongodb.net`

## Alternative: Use MongoDB Compass to Test

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Paste your connection string
3. If it connects successfully in Compass, use that same string in `.env.local`
4. If it fails in Compass, you know the connection string is wrong

## Still Having Issues?

### Check These:

1. **IP Whitelist**: Make sure your IP is whitelisted in Atlas
   - Go to "Network Access" in Atlas
   - Add your current IP or use `0.0.0.0/0` for development

2. **Database User**: Verify the user exists
   - Go to "Database Access" in Atlas
   - Make sure `radio_user` exists with the correct password

3. **Password Special Characters**: If your password has special characters, URL-encode them:
   - `@` becomes `%40`
   - `#` becomes `%23`
   - `$` becomes `%24`
   - etc.

4. **Firewall**: Some networks block MongoDB connections
   - Try from a different network
   - Check if port 27017 is blocked

## Need to Create a New Cluster?

If you don't have a cluster yet:

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up for a free account
3. Create a new cluster (M0 Free tier)
4. Create a database user
5. Whitelist your IP
6. Get the connection string from "Connect" → "Connect your application"

See [DATABASE_SETUP.md](DATABASE_SETUP.md) for detailed instructions.
