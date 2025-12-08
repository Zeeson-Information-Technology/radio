# Database Setup Guide

Quick guide to set up MongoDB for the Islamic Online Radio application.

## Option 1: MongoDB Atlas (Recommended for Development)

### Step 1: Create a Free Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Sign up or log in
3. Click "Build a Database"
4. Choose the **FREE** tier (M0 Sandbox)
5. Select a cloud provider and region (choose one close to you)
6. Name your cluster (e.g., "online-radio-dev")
7. Click "Create"

### Step 2: Create a Database User

1. In the Atlas dashboard, go to "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Set username and password (save these!)
5. Set privileges to "Read and write to any database"
6. Click "Add User"

### Step 3: Whitelist Your IP Address

1. Go to "Network Access"
2. Click "Add IP Address"
3. Either:
   - Click "Add Current IP Address" (for your current location)
   - Or click "Allow Access from Anywhere" (0.0.0.0/0) for development
4. Click "Confirm"

### Step 4: Get Your Connection String

1. Go to "Database" in the left sidebar
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Copy the connection string (looks like):
   ```
   mongodb+srv://<username>:<password>@cluster.mongodb.net/?retryWrites=true&w=majority
   ```
5. Replace `<username>` and `<password>` with your database user credentials
6. Add your database name after `.net/` (e.g., `online-radio`):
   ```
   mongodb+srv://myuser:mypass@cluster.mongodb.net/online-radio?retryWrites=true&w=majority
   ```

### Step 5: Update .env.local

Add the connection string to your `.env.local` file:

```env
MONGODB_URI=mongodb+srv://myuser:mypass@cluster.mongodb.net/online-radio?retryWrites=true&w=majority
```

## Option 2: Local MongoDB

### Step 1: Install MongoDB

**Windows:**
1. Download from [MongoDB Download Center](https://www.mongodb.com/try/download/community)
2. Run the installer
3. Choose "Complete" installation
4. Install MongoDB as a service

**macOS (with Homebrew):**
```bash
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get install mongodb
sudo systemctl start mongodb
sudo systemctl enable mongodb
```

### Step 2: Update .env.local

For local MongoDB, use:

```env
MONGODB_URI=mongodb://localhost:27017/online-radio
```

## Testing the Connection

1. Start your Next.js dev server:
   ```bash
   cd online-radio
   npm run dev
   ```

2. Visit the test endpoint:
   ```
   http://localhost:3000/api/db-test
   ```

3. You should see a JSON response like:
   ```json
   {
     "ok": true,
     "message": "Database connection successful",
     "liveState": {
       "id": "...",
       "isLive": false,
       "mount": "/stream",
       "title": "Initial state"
     }
   }
   ```

## Viewing Your Data

### MongoDB Atlas

1. Go to your Atlas dashboard
2. Click "Browse Collections"
3. You'll see your database and collections

### Local MongoDB (MongoDB Compass)

1. Download [MongoDB Compass](https://www.mongodb.com/products/compass)
2. Connect to `mongodb://localhost:27017`
3. Browse your databases and collections

### Command Line (mongosh)

```bash
# Connect to local MongoDB
mongosh

# Or connect to Atlas
mongosh "mongodb+srv://cluster.mongodb.net/online-radio" --username myuser

# List databases
show dbs

# Use your database
use online-radio

# List collections
show collections

# View LiveState documents
db.livestates.find().pretty()
```

## Common Issues

### "MONGODB_URI is not defined"

**Problem:** Environment variable not loaded

**Solution:**
1. Make sure `.env.local` exists in the `online-radio` folder
2. Restart your dev server after adding the variable
3. Check for typos in the variable name

### "Connection timeout"

**Problem:** Can't reach MongoDB server

**Solution for Atlas:**
- Check your IP whitelist in Network Access
- Verify your connection string is correct
- Make sure your password doesn't contain special characters (or URL-encode them)

**Solution for Local:**
- Make sure MongoDB service is running
- Check if port 27017 is open

### "Authentication failed"

**Problem:** Wrong username or password

**Solution:**
- Double-check your database user credentials
- Make sure you're using the database user (not your Atlas account)
- URL-encode special characters in password

### "Cannot overwrite model"

**Problem:** Hot-reload issue in development

**Solution:**
- Restart your dev server
- This should be rare due to our model export pattern

## Security Notes

### For Development

- It's okay to use "Allow Access from Anywhere" (0.0.0.0/0) in Atlas
- Keep your `.env.local` file in `.gitignore` (it already is)

### For Production

- Use specific IP addresses in Atlas Network Access
- Use strong passwords for database users
- Consider using MongoDB's built-in encryption
- Never commit `.env.local` or connection strings to git
- Use Vercel's environment variables for production

## Next Steps

Once your database is connected:

1. ✅ Test the connection with `/api/db-test`
2. ✅ Verify data appears in MongoDB
3. 🔜 Move to Phase 3 (Authentication)
4. 🔜 Build out the admin dashboard
5. 🔜 Implement live stream controls

## Resources

- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com/)
- [Mongoose Documentation](https://mongoosejs.com/docs/)
- [MongoDB Connection String Format](https://docs.mongodb.com/manual/reference/connection-string/)
- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
