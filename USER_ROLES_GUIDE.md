# User Roles & Permissions Guide

## Role Hierarchy

Al-Manhaj Radio uses a three-tier role system:

### 1. 👑 Super Admin
**Who:** ibrahim.saliman.zainab@gmail.com (you) and anyone you promote

**Can do:**
- ✅ Create Admins
- ✅ Create Presenters
- ✅ Manage schedules
- ✅ Go live / Stop live / Pause / Resume
- ✅ View all users
- ✅ Access all admin features

**Cannot do through UI:**
- ❌ Create other Super Admins (must be done via database)

### 2. 🔧 Admin
**Who:** Trusted team members who help manage the radio

**Can do:**
- ✅ Create Presenters only (not other Admins)
- ✅ Manage schedules
- ✅ Go live / Stop live / Pause / Resume
- ✅ View all users
- ✅ Access most admin features

**Cannot do:**
- ❌ Create Admins or Super Admins
- ❌ Delete Super Admins

### 3. 🎙️ Presenter
**Who:** Scholars and lecturers who broadcast

**Can do:**
- ✅ Go live / Stop live / Pause / Resume
- ✅ Manage schedules (create, edit, delete)
- ✅ Change their own password
- ✅ Broadcast lectures

**Cannot do:**
- ❌ Create users
- ❌ View other users
- ❌ Access user management features

---

## How to Create Users

### As Super Admin:
1. Go to `/admin/live`
2. Click **"👥 Users"**
3. Click **"Add New User"**
4. Enter email
5. Select role:
   - **Admin** - Can create presenters and manage everything
   - **Presenter** - Can only broadcast
6. Click **"Create"**
7. Copy the temporary password and send it to the user

### As Admin:
1. Same steps as above
2. But you can only select **"Presenter"** role
3. You cannot create other Admins

---

## How to Make Someone Super Admin

**Important:** Super Admin role can only be assigned via database for security.

### Steps:

1. **Create them as Admin first:**
   - Log in as Super Admin
   - Go to Users → Add New User
   - Create them as **Admin**
   - Give them the temporary password

2. **Update in MongoDB:**
   - Go to MongoDB Atlas
   - Navigate to: `Cluster0` → `online-radio` → `adminusers`
   - Find the user by email
   - Click **Edit**
   - Change `role` from `"admin"` to `"super_admin"`
   - Click **Update**

3. **User logs out and back in:**
   - They need to log out and log back in
   - They will now have Super Admin privileges

---

## Permission Matrix

| Feature | Super Admin | Admin | Presenter |
|---------|-------------|-------|-----------|
| Create Super Admins | ❌ (DB only) | ❌ | ❌ |
| Create Admins | ✅ | ❌ | ❌ |
| Create Presenters | ✅ | ✅ | ❌ |
| Manage Schedules | ✅ | ✅ | ✅ |
| View Users | ✅ | ✅ | ❌ |
| Go Live | ✅ | ✅ | ✅ |
| Pause/Resume | ✅ | ✅ | ✅ |
| Change Own Password | ✅ | ✅ | ✅ |

---

## Security Best Practices

### For Super Admins:
- ✅ Keep your password secure
- ✅ Only promote trusted people to Admin
- ✅ Only promote very trusted people to Super Admin (via database)
- ✅ Regularly review user list
- ✅ Remove users who no longer need access

### For Admins:
- ✅ Only create Presenters for verified scholars
- ✅ Keep your password secure
- ✅ Don't share your credentials

### For Presenters:
- ✅ Change your password after first login
- ✅ Keep your password secure
- ✅ Only use your account for broadcasting

---

## Current Super Admin

**Email:** ibrahim.saliman.zainab@gmail.com  
**Role:** super_admin  
**Created:** Initial seed

---

## Troubleshooting

### "Only super admin can create admin users" error
- You're logged in as a regular Admin
- You can only create Presenters
- Ask a Super Admin to create Admin users

### Can't see "Users" button
- You're logged in as a Presenter
- Only Super Admins and Admins can see this button
- Contact an Admin if you need access

### Need to become Super Admin
- Ask the current Super Admin to:
  1. Create you as Admin first
  2. Update your role in MongoDB to "super_admin"
  3. You log out and back in

---

## Database Schema

```typescript
interface IAdminUser {
  email: string;
  passwordHash: string;
  role: "super_admin" | "admin" | "presenter";
  mustChangePassword: boolean;
  createdBy: ObjectId | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}
```

---

## Quick Reference

**To upgrade your role to super_admin in MongoDB:**

```javascript
// In MongoDB Atlas Query
db.adminusers.updateOne(
  { email: "your.email@example.com" },
  { $set: { role: "super_admin" } }
)
```

**To check your current role:**

```javascript
// In MongoDB Atlas Query
db.adminusers.findOne({ email: "your.email@example.com" })
```
