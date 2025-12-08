# Admin Object Serialization Fix

## Problem

When passing Mongoose document objects (like `IAdminUser`) from Server Components to Client Components in Next.js, you get this error:

```
Error: Only plain objects can be passed to Client Components from Server Components. 
Objects with toJSON methods are not supported.
```

This happens because Mongoose documents contain methods and special properties that cannot be serialized for client-side use.

## Solution

### 1. Created Serialized Type

Created a plain object type that can be safely passed to Client Components:

**File:** `lib/types/admin.ts`

```typescript
export interface SerializedAdmin {
  _id: string;
  email: string;
  role: "admin" | "presenter";
  mustChangePassword: boolean;
  createdAt?: string;
  lastLoginAt?: string;
}
```

### 2. Created Serialization Helper

Created a utility function to convert Mongoose documents to plain objects:

**File:** `lib/utils/serialize-admin.ts`

```typescript
export function serializeAdmin(admin: IAdminUser): SerializedAdmin {
  return {
    _id: admin._id.toString(),
    email: admin.email,
    role: admin.role,
    mustChangePassword: admin.mustChangePassword,
    createdAt: admin.createdAt?.toISOString(),
    lastLoginAt: admin.lastLoginAt?.toISOString(),
  };
}
```

### 3. Updated Server Components

Updated all admin pages to serialize the admin object before passing to Client Components:

**Before:**
```typescript
return <LiveControlPanel admin={admin} />;
```

**After:**
```typescript
import { serializeAdmin } from "@/lib/utils/serialize-admin";

return <LiveControlPanel admin={serializeAdmin(admin)} />;
```

### 4. Updated Client Components

Updated all Client Components to use the `SerializedAdmin` type:

**Before:**
```typescript
import { IAdminUser } from "@/lib/models/AdminUser";

interface LiveControlPanelProps {
  admin: IAdminUser;
}
```

**After:**
```typescript
import { SerializedAdmin } from "@/lib/types/admin";

interface LiveControlPanelProps {
  admin: SerializedAdmin;
}
```

## Files Updated

### Server Components (Pages)
- `app/admin/live/page.tsx`
- `app/admin/schedule/page.tsx`
- `app/admin/change-password/page.tsx`

### Client Components
- `app/admin/live/LiveControlPanel.tsx`
- `app/admin/schedule/ScheduleList.tsx`
- `app/admin/change-password/ChangePasswordForm.tsx`

### New Files Created
- `lib/types/admin.ts` - Serialized admin type
- `lib/utils/serialize-admin.ts` - Serialization helper function

## Key Points

1. **Always serialize Mongoose documents** before passing them from Server to Client Components
2. **Convert ObjectIds to strings** using `.toString()`
3. **Convert Dates to ISO strings** using `.toISOString()`
4. **Only include necessary fields** in the serialized object
5. **Use a shared type** to ensure consistency across components

## Benefits

- ✅ No more serialization errors
- ✅ Type-safe data passing between Server and Client Components
- ✅ Cleaner, more maintainable code
- ✅ Reusable serialization logic
- ✅ Smaller payload (only necessary data is sent to client)

## Usage Pattern

Whenever you need to pass data from a Server Component to a Client Component:

1. Create a serialized type (plain object with primitive types)
2. Create a serialization function
3. Use the serialization function in the Server Component
4. Use the serialized type in the Client Component

This pattern applies to any Mongoose model or complex object that needs to be passed to the client.
