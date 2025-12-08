# Testing Phase 3 - Authentication Quick Guide

## Prerequisites

- ✅ Phase 2 complete (MongoDB connected)
- ✅ Development server can start
- ✅ `.env.local` has MONGODB_URI and JWT_SECRET

## Quick Test (5 minutes)

### Step 1: Create Admin User

```bash
cd online-radio

# Add admin credentials to .env.local (or use command line)
echo "" >> .env.local
echo "# Admin seeding (for development only)" >> .env.local
echo "ADMIN_EMAIL=admin@example.com" >> .env.local
echo "ADMIN_PASSWORD=admin123" >> .env.local

# Run seed script
npx tsx scripts/seed-admin.ts
```

**Expected Output:**
```
🔌 Connecting to database...
✅ Connected to database
🔐 Hashing password...
👤 Creating admin user...
✅ Admin user created successfully!

Details:
  Email: admin@example.com
  Role: admin
  ID: 675506a1234567890abcdef0

🎉 You can now log in at /admin/login
```

### Step 2: Start Server

```bash
npm run dev
```

Wait for "Ready" message.

### Step 3: Test Authentication Flow

#### Test 1: Protected Route Redirect
1. Open browser: http://localhost:3000/admin/live
2. **Expected:** Redirects to http://localhost:3000/admin/login
3. ✅ **Pass:** Route is protected

#### Test 2: Login with Wrong Credentials
1. On login page, enter:
   - Email: `wrong@example.com`
   - Password: `wrongpassword`
2. Click "Sign In"
3. **Expected:** Red error message "Invalid credentials"
4. ✅ **Pass:** Invalid login rejected

#### Test 3: Login with Correct Credentials
1. On login page, enter:
   - Email: `admin@example.com`
   - Password: `admin123`
2. Click "Sign In"
3. **Expected:** 
   - Redirects to http://localhost:3000/admin/live
   - Shows "Logged in as: admin@example.com • admin"
   - Shows "Logout" button
4. ✅ **Pass:** Login successful

#### Test 4: Auto-Redirect When Logged In
1. While logged in, visit: http://localhost:3000/admin/login
2. **Expected:** Immediately redirects to /admin/live
3. ✅ **Pass:** Already logged in users can't access login page

#### Test 5: Logout
1. On /admin/live page, click "Logout" button
2. **Expected:** Redirects to /admin/login
3. Try accessing http://localhost:3000/admin/live again
4. **Expected:** Redirects back to /admin/login
5. ✅ **Pass:** Logout works correctly

### Step 4: Verify Cookie (Optional)

1. Log in again
2. Open DevTools (F12)
3. Go to Application → Cookies → http://localhost:3000
4. **Expected:** See `admin_token` cookie with:
   - HttpOnly: ✓
   - Path: /
   - SameSite: Strict
5. ✅ **Pass:** Cookie is secure

## Test Checklist

- [ ] Seed script creates admin user
- [ ] /admin/live redirects to /admin/login when not logged in
- [ ] Wrong credentials show error message
- [ ] Correct credentials log in successfully
- [ ] /admin/live shows user email and role
- [ ] /admin/login redirects to /admin/live when already logged in
- [ ] Logout button works
- [ ] After logout, /admin/live redirects to login
- [ ] admin_token cookie is set when logged in
- [ ] admin_token cookie is cleared when logged out

## Common Issues

### Issue: "ADMIN_EMAIL and ADMIN_PASSWORD must be set"

**Solution:**
```bash
# Run with inline environment variables
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=admin123 npx tsx scripts/seed-admin.ts
```

### Issue: "Admin user already exists"

**Solution:** This is normal! The admin was already created. You can log in with the existing credentials.

To create a different admin:
```bash
ADMIN_EMAIL=sheikh@example.com ADMIN_PASSWORD=sheikh123 npx tsx scripts/seed-admin.ts
```

### Issue: Login shows "Invalid credentials" but credentials are correct

**Solution:**
1. Check MongoDB - make sure the admin user exists:
   - Go to MongoDB Atlas → Browse Collections
   - Database: online-radio
   - Collection: adminusers
   - Should see your admin user

2. Try re-seeding:
   ```bash
   # Delete the admin from MongoDB first, then re-seed
   npx tsx scripts/seed-admin.ts
   ```

### Issue: Cookie not being set

**Solution:**
1. Check browser console for errors
2. Make sure you're on http://localhost:3000 (not a different port)
3. Clear all cookies and try again
4. Check Network tab → Response Headers for `Set-Cookie`

### Issue: Redirects not working

**Solution:**
1. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
2. Clear browser cache
3. Restart the dev server

## API Testing (Advanced)

### Test Login API

```bash
# Successful login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}' \
  -v

# Look for Set-Cookie header in response
```

**Expected Response:**
```json
{
  "ok": true,
  "message": "Login successful",
  "user": {
    "email": "admin@example.com",
    "role": "admin"
  }
}
```

### Test Logout API

```bash
curl -X POST http://localhost:3000/api/admin/logout \
  -H "Cookie: admin_token=YOUR_TOKEN_HERE"
```

**Expected Response:**
```json
{
  "ok": true,
  "message": "Logout successful"
}
```

## What to Test in Each Page

### /admin/login
- [ ] Form renders correctly
- [ ] Email input works
- [ ] Password input works
- [ ] Submit button works
- [ ] Error messages display
- [ ] Loading state shows during login
- [ ] Redirects to /admin/live on success
- [ ] Auto-redirects if already logged in

### /admin/live
- [ ] Redirects to /admin/login if not authenticated
- [ ] Shows user email and role when logged in
- [ ] Logout button is visible
- [ ] Logout button works
- [ ] Live control form is visible (placeholder)
- [ ] Streaming instructions are visible

## Success Criteria

✅ All items in the test checklist are checked  
✅ No console errors  
✅ No TypeScript errors  
✅ Authentication flow works smoothly  
✅ Cookies are set correctly  
✅ Redirects work as expected  

## Next Steps

Once all tests pass:
1. ✅ Phase 3 is complete!
2. 🔜 Ready for Phase 4 (Live State APIs)
3. 🔜 Implement actual live stream control
4. 🔜 Connect radio page to live state

## Quick Commands

```bash
# Create admin
npx tsx scripts/seed-admin.ts

# Start dev server
npm run dev

# Check TypeScript errors
npm run build

# View logs
# (Check terminal where npm run dev is running)
```

## Browser Testing URLs

- Home: http://localhost:3000
- Radio: http://localhost:3000/radio
- Admin Login: http://localhost:3000/admin/login
- Admin Live: http://localhost:3000/admin/live (requires login)

## Expected Behavior Summary

| Action | Expected Result |
|--------|----------------|
| Visit /admin/live (not logged in) | Redirect to /admin/login |
| Login with wrong credentials | Show error message |
| Login with correct credentials | Redirect to /admin/live |
| Visit /admin/login (logged in) | Redirect to /admin/live |
| Click logout | Redirect to /admin/login |
| Visit /admin/live (after logout) | Redirect to /admin/login |

If all these behaviors work correctly, Phase 3 is complete! 🎉
