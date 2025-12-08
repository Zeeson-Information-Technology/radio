# Quick Start Guide - Islamic Online Radio

## Step 1: Create Super Admin (One-Time Setup)

Your super admin account has been created! ✅

**Login Credentials:**
- **Email**: `ibrahim.saliman.zainab@gmail.com`
- **Password**: `admin100%` (from your SUPER_ADMIN_PASSWORD in .env.local)

## Step 2: Start the Application

```bash
cd online-radio
npm run dev
```

Wait for "Ready" message, then open: http://localhost:3000

## Step 3: Log In as Super Admin

1. Go to: http://localhost:3000/admin/login
2. Enter:
   - Email: `ibrahim.saliman.zainab@gmail.com`
   - Password: `admin100%`
3. Click "Sign In"
4. You'll be redirected to the admin dashboard

## Step 4: Create Users (Admins or Presenters)

As super admin, you can create two types of users:

### Admin Users
- Can create other admins and presenters
- Can manage all users
- Can control live streams
- Full access to everything

### Presenter Users
- Can control live streams
- Can change their own password
- Cannot create or manage other users

### How to Create Users

1. From the dashboard, click **"Manage Users"** button
2. Click **"Add User"**
3. Enter the user's email address
4. Select role:
   - **Presenter** (default) - For people who will manage live streams
   - **Admin** - For people who need full access
5. Click **"Create User"**
6. Copy the temporary password shown
7. Share it securely with the new user (email, WhatsApp, etc.)

## User Roles Explained

### 🔴 Admin (Full Access)
- ✅ Create and manage other admins
- ✅ Create and manage presenters
- ✅ Control live streams
- ✅ View all users
- ✅ Change own password
- ✅ Help presenters if they're unavailable

### 🔵 Presenter (Stream Control)
- ✅ Control live streams (start/stop)
- ✅ Set lecture title and lecturer name
- ✅ Change own password
- ❌ Cannot create or manage users
- ❌ Cannot access user management pages

## Common Tasks

### Create a Presenter

1. Log in as admin
2. Click "Manage Users"
3. Click "Add User"
4. Enter email: `presenter@example.com`
5. Keep role as "Presenter" (default)
6. Click "Create User"
7. Copy and share the temporary password

### Create Another Admin

1. Log in as admin
2. Click "Manage Users"
3. Click "Add User"
4. Enter email: `another-admin@example.com`
5. Change role to "Admin"
6. Click "Create User"
7. Copy and share the temporary password

### Change Your Password

1. Log in
2. Click "Change Password" button in header
3. Enter current password
4. Enter new password (minimum 6 characters)
5. Confirm new password
6. Click "Change Password"

### Help a Presenter

If a presenter is unavailable, you (as admin) can:
1. Log in with your admin account
2. Access the live stream controls
3. Start/stop the stream on their behalf
4. Set the lecture details

## Important Notes

### Password Changes
- ✅ Password change is **optional** (not forced)
- ✅ Users can change password anytime from "Change Password" button
- ✅ New users get a temporary password but are NOT forced to change it
- ✅ Similar to Slack, Zoho, GitHub, etc.

### Security
- ✅ All passwords are hashed with bcrypt
- ✅ JWT tokens stored in HTTP-only cookies
- ✅ Secure authentication
- ✅ Role-based access control

### Temporary Passwords
- Generated automatically (8 random characters)
- Example: `a3f7b2c9`
- Share securely with new users
- Users can optionally change them later

## URLs Reference

- **Home**: http://localhost:3000
- **Radio (Public)**: http://localhost:3000/radio
- **Admin Login**: http://localhost:3000/admin/login
- **Admin Dashboard**: http://localhost:3000/admin/live
- **User Management**: http://localhost:3000/admin/presenters
- **Change Password**: http://localhost:3000/admin/change-password

## Troubleshooting

### Can't log in as super admin

**Check:**
- Email is exactly: `ibrahim.saliman.zainab@gmail.com`
- Password matches your `SUPER_ADMIN_PASSWORD` in `.env.local`
- MongoDB is connected (check `/api/db-test`)

### "Manage Users" button not showing

**Solution:**
- Make sure you're logged in as an admin (not presenter)
- Check your role in MongoDB
- Try logging out and back in

### Can't create users

**Solution:**
- Make sure you're logged in as admin
- Check browser console for errors
- Verify MongoDB connection

### Presenter can see "Manage Users"

**Solution:**
- This shouldn't happen
- Check the user's role in database
- Make sure they were created with role: "presenter"

## Next Steps

After setting up users:

1. ✅ Super admin created
2. ✅ Create presenter accounts for your team
3. ✅ Create additional admin accounts if needed
4. 🔜 Phase 4: Implement live stream control
5. 🔜 Phase 5: Configure streaming server
6. 🔜 Phase 6: Additional features

## Need Help?

See detailed documentation:
- `SEED_SUPER_ADMIN.md` - Super admin setup
- `PHASE3_COMPLETE.md` - Full Phase 3 documentation
- `TESTING_PHASE3.md` - Testing procedures
- `DATABASE_SETUP.md` - MongoDB setup

## Quick Commands

```bash
# Start dev server
npm run dev

# Create super admin (if not already created)
node scripts/create-super-admin.mjs

# Check database connection
# Visit: http://localhost:3000/api/db-test

# Build for production
npm run build
```

## Summary

You now have:
- ✅ Super admin account: `ibrahim.saliman.zainab@gmail.com`
- ✅ Ability to create admins and presenters
- ✅ Role-based access control
- ✅ Optional password changes
- ✅ User management interface

Ready to manage your Islamic Online Radio! 🎉
