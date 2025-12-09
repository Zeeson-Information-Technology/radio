# Duplicate Email Protection

## Overview
The system prevents duplicate email addresses across all user roles (super_admin, admin, presenter).

## Protection Layers

### 1. Database Level (Primary Protection)
**Location:** `lib/models/AdminUser.ts`

```typescript
email: {
  type: String,
  required: true,
  unique: true,      // ← MongoDB unique index
  lowercase: true,   // ← Normalizes to lowercase
  trim: true,        // ← Removes whitespace
}
```

**How it works:**
- MongoDB creates a unique index on the `email` field
- Prevents duplicate emails at the database level
- Automatically converts emails to lowercase before saving
- Trims whitespace to prevent "user@example.com" vs " user@example.com "

### 2. Application Level (Secondary Protection)
**Location:** `app/api/admin/presenters/route.ts`

```typescript
// Check if user already exists
const existingUser = await AdminUser.findOne({ email: email.toLowerCase() });
if (existingUser) {
  return NextResponse.json(
    { error: "A user with this email already exists" },
    { status: 409 }
  );
}
```

**How it works:**
- Before creating a new user, checks if email already exists
- Returns HTTP 409 (Conflict) status code
- Provides clear error message to the user

### 3. MongoDB Error Handling (Fallback Protection)
**Location:** `app/api/admin/presenters/route.ts`

```typescript
// Handle MongoDB duplicate key error
if (error instanceof Error && 'code' in error && (error as any).code === 11000) {
  return NextResponse.json(
    { error: "A user with this email already exists" },
    { status: 409 }
  );
}
```

**How it works:**
- Catches MongoDB duplicate key error (code 11000)
- Provides user-friendly error message
- Prevents raw database errors from reaching the client

## User Experience

### When Creating a User:
1. Admin enters email: `test@example.com`
2. System checks if email exists
3. If exists:
   - Shows error: "A user with this email already exists"
   - User can try a different email
4. If doesn't exist:
   - Creates user successfully
   - Shows temporary password

### Email Normalization:
- `Test@Example.com` → `test@example.com`
- ` user@example.com ` → `user@example.com`
- This prevents duplicates like:
  - `User@Example.com` and `user@example.com` (same email)

## Testing

### Test Case 1: Create User Twice
```bash
# First attempt - SUCCESS
POST /api/admin/presenters
{ "email": "test@example.com", "role": "presenter" }
→ 200 OK

# Second attempt - FAIL
POST /api/admin/presenters
{ "email": "test@example.com", "role": "presenter" }
→ 409 Conflict: "A user with this email already exists"
```

### Test Case 2: Case Insensitive
```bash
# First attempt
POST /api/admin/presenters
{ "email": "Test@Example.com", "role": "presenter" }
→ 200 OK

# Second attempt with different case
POST /api/admin/presenters
{ "email": "test@example.com", "role": "presenter" }
→ 409 Conflict: "A user with this email already exists"
```

### Test Case 3: Across Roles
```bash
# Create as presenter
POST /api/admin/presenters
{ "email": "user@example.com", "role": "presenter" }
→ 200 OK

# Try to create same email as admin
POST /api/admin/presenters
{ "email": "user@example.com", "role": "admin" }
→ 409 Conflict: "A user with this email already exists"
```

## Security Benefits

1. **Prevents Account Confusion:** Each email is unique across the system
2. **Prevents Privilege Escalation:** Can't create duplicate admin with same email
3. **Data Integrity:** Ensures one user per email address
4. **Clear Error Messages:** Users know exactly what went wrong

## Implementation Status

✅ Database unique constraint  
✅ Application-level validation  
✅ MongoDB error handling  
✅ Email normalization (lowercase + trim)  
✅ User-friendly error messages  
✅ Works across all roles (super_admin, admin, presenter)

## Related Files

- `lib/models/AdminUser.ts` - Database schema with unique constraint
- `app/api/admin/presenters/route.ts` - API with duplicate checking
- `app/admin/presenters/new/NewPresenterForm.tsx` - Form that displays errors
