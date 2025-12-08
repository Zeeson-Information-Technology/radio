# Super Admin Seeding Guide

## Overview

This guide explains how to create the super admin account for the Islamic Online Radio application.

## Super Admin Details

The super admin account has the following characteristics:
- **Email**: `ibrahim.saliman.zainab@gmail.com`
- **Role**: `admin`
- **Password**: Set via environment variable
- **Created By**: `null` (self-created)
- **Must Change Password**: `false` (no forced password change)

## Setup Instructions

### Step 1: Set Environment Variable

Add the super admin password to your `.env.local` file:

```env
SUPER_ADMIN_PASSWORD=YourSecurePasswordHere
```

**Important**: Choose a strong password with:
- At least 8 characters
- Mix of uppercase and lowercase letters
- Numbers and special characters
- Example: `SuperSecure123!`

### Step 2: Run the Seed Script

Execute the seed script to create the super admin:

```bash
cd online-radio
npx tsx scripts/seed-admin.ts
```

### Expected Output

```
🔌 Connecting to database...
✅ Connected to database
👑 Creating super admin...
✅ Super admin created successfully!
  Email: ibrahim.saliman.zainab@gmail.com
  Role: admin

🎉 Seeding complete! You can now log in at /admin/login
```

### If Super Admin Already Exists

If the super admin account already exists, you'll see:

```
✅ Super admin already exists: ibrahim.saliman.zainab@gmail.com
```

This is normal and means the account was already created. The script will not create duplicates.

## Additional Admin Accounts

The seed script also supports creating additional admin accounts using these environment variables:

```env
ADMIN_EMAIL=another-admin@example.com
ADMIN_PASSWORD=AnotherPassword123
```

Both accounts will be created if the environment variables are set.

## Logging In

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to: http://localhost:3000/admin/login

3. Enter credentials:
   - **Email**: `ibrahim.saliman.zainab@gmail.com`
   - **Password**: The password you set in `SUPER_ADMIN_PASSWORD`

4. You'll be redirected to the admin dashboard at `/admin/live`

## Super Admin Capabilities

As a super admin, you can:
- ✅ Access the live stream control panel
- ✅ Start and stop live streams (Phase 4)
- ✅ Create and manage presenter accounts
- ✅ View all presenters
- ✅ Change your own password (optional)
- ✅ Access all admin features

## Security Notes

### Production Deployment

When deploying to production (Vercel):

1. **Never commit** `.env.local` to git (it's already in `.gitignore`)

2. Set environment variables in Vercel dashboard:
   - Go to Project Settings → Environment Variables
   - Add `SUPER_ADMIN_PASSWORD` with a strong password
   - Add other required variables (`MONGODB_URI`, `JWT_SECRET`, etc.)

3. Redeploy the application

4. Run the seed script in production (one-time):
   - You can create an API endpoint for seeding (protected)
   - Or connect to your production database locally and run the script

### Password Security

- ✅ Passwords are hashed with bcrypt (10 salt rounds)
- ✅ Never stored in plain text
- ✅ HTTP-only cookies prevent XSS attacks
- ✅ Secure flag enabled in production (HTTPS only)

### Changing Super Admin Password

The super admin can change their password at any time:

1. Log in to the admin dashboard
2. Click "Change Password" button
3. Enter current password and new password
4. Submit the form

## Troubleshooting

### "SUPER_ADMIN_PASSWORD not set"

**Solution**: Add `SUPER_ADMIN_PASSWORD` to your `.env.local` file and restart the seed script.

### "Connection error"

**Solution**: 
- Make sure MongoDB is running and `MONGODB_URI` is set correctly
- Check your network connection
- Verify MongoDB Atlas IP whitelist settings

### "Admin user already exists"

**Solution**: This is normal. The super admin was already created. You can log in with the existing credentials.

### Can't log in

**Solution**:
- Verify you're using the correct email: `ibrahim.saliman.zainab@gmail.com`
- Check that the password matches what you set in `SUPER_ADMIN_PASSWORD`
- Try resetting the password by deleting the user from MongoDB and re-running the seed script

## Database Verification

To verify the super admin was created correctly:

### MongoDB Atlas
1. Go to your Atlas dashboard
2. Click "Browse Collections"
3. Navigate to `online-radio` → `adminusers`
4. Look for the document with email `ibrahim.saliman.zainab@gmail.com`
5. Verify:
   - `role: "admin"`
   - `createdBy: null`
   - `mustChangePassword: false`

### MongoDB Compass
1. Connect to your database
2. Browse to `online-radio.adminusers`
3. Find the super admin document
4. Verify the fields as above

## Environment Variables Summary

Required for seeding:

```env
# MongoDB Connection (required)
MONGODB_URI=mongodb+srv://...

# JWT Secret (required for login)
JWT_SECRET=your_jwt_secret_here

# Super Admin (required for seeding)
SUPER_ADMIN_PASSWORD=YourSecurePasswordHere

# Optional: Additional admin account
ADMIN_EMAIL=another-admin@example.com
ADMIN_PASSWORD=AnotherPassword123
```

## Next Steps

After creating the super admin:

1. ✅ Log in to verify the account works
2. ✅ Create presenter accounts from `/admin/presenters`
3. ✅ Configure streaming settings (Phase 5)
4. ✅ Test the live stream functionality (Phase 4)

## Support

If you encounter issues:
- Check the console output for error messages
- Verify all environment variables are set correctly
- Ensure MongoDB connection is working
- Review the `PHASE3_COMPLETE.md` documentation
