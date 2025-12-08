# Phase 2 Complete - Database Integration & Core Models

## What Was Built

Phase 2 of the Islamic Online Radio project has been successfully completed. This phase focused on integrating MongoDB with Mongoose and defining all core data models needed for the application.

## New Dependencies

- **mongoose** (v9.0.1) - MongoDB ODM for Node.js

## Project Structure Updates

```
online-radio/
├── lib/
│   ├── db.ts                      # MongoDB connection helper (NEW)
│   ├── config.ts                  # Environment configuration (existing)
│   └── models/                    # Mongoose models (NEW)
│       ├── AdminUser.ts           # Admin/Sheikh user model
│       ├── LiveState.ts           # Current live stream status
│       ├── Schedule.ts            # Scheduled lectures
│       └── Episode.ts             # Recorded lecture metadata
└── app/
    └── api/
        └── db-test/               # Database test endpoint (NEW)
            └── route.ts
```

## Features Implemented

### 1. Database Connection Helper (lib/db.ts)

A robust MongoDB connection helper with the following features:

- **Cached Connection Pattern**: Prevents creating multiple connections during Next.js hot-reload in development
- **Global Caching**: Uses Node.js global object to persist connection across module reloads
- **Error Handling**: Throws clear error if MONGODB_URI is missing
- **TypeScript Support**: Fully typed with proper Mongoose types
- **Next.js App Router Compatible**: Works seamlessly with server components and API routes

**Usage:**
```typescript
import { connectDB } from "@/lib/db";

await connectDB(); // Returns cached connection or creates new one
```

### 2. Core Mongoose Models

#### AdminUser Model (lib/models/AdminUser.ts)

Represents admin users and sheikhs who can manage the radio.

**Fields:**
- `email` (string, required, unique, lowercase) - User's email address
- `passwordHash` (string, required) - Hashed password (bcrypt in Phase 3)
- `role` (enum: "admin" | "sheikh", default: "sheikh") - User role
- `createdAt` (Date, default: now) - Account creation timestamp

**Schema Rules:**
- Email is automatically lowercased and trimmed
- Email must be unique across all users
- Role defaults to "sheikh" if not specified

#### LiveState Model (lib/models/LiveState.ts)

Represents the current live status of the radio stream.

**Fields:**
- `isLive` (boolean, default: false) - Whether stream is currently live
- `mount` (string, default: "/stream") - Stream mount point
- `lecturer` (string, optional) - Current lecturer name
- `title` (string, optional) - Current lecture title
- `startedAt` (Date, optional) - When current session started
- `updatedAt` (Date, default: now) - Last update timestamp

**Schema Rules:**
- `updatedAt` is automatically updated on save via pre-save hook
- Only one LiveState document should exist (singleton pattern)

#### Schedule Model (lib/models/Schedule.ts)

Represents planned lecture/stream times.

**Fields:**
- `dayOfWeek` (number, 0-6, required) - Day of week (0=Sunday, 6=Saturday)
- `startTime` (string, required) - Start time in 24h format (e.g., "20:00")
- `durationMinutes` (number, required, min: 1) - Lecture duration
- `mount` (string, default: "/stream") - Stream mount point
- `lecturer` (string, required) - Lecturer name
- `topic` (string, required) - Lecture topic
- `active` (boolean, default: true) - Whether schedule is active

**Schema Rules:**
- `startTime` is validated to match HH:MM format (24-hour)
- `dayOfWeek` must be between 0 and 6
- Includes automatic `createdAt` and `updatedAt` timestamps

#### Episode Model (lib/models/Episode.ts)

Represents metadata for recorded lectures.

**Fields:**
- `title` (string, required) - Episode title
- `lecturer` (string, required) - Lecturer name
- `description` (string, optional) - Episode description
- `storageKey` (string, required) - Storage path (e.g., "recordings/2025-12-07-tafsir.mp3")
- `durationSec` (number, optional) - Duration in seconds
- `tags` (string[], default: []) - Searchable tags
- `createdAt` (Date, default: now) - Creation timestamp

**Schema Rules:**
- `tags` defaults to empty array if not provided
- `storageKey` will be used to reference audio files in future phases

### 3. Database Test Endpoint (app/api/db-test/route.ts)

A simple API endpoint to verify MongoDB integration.

**Endpoint:** `GET /api/db-test`

**Behavior:**
1. Connects to MongoDB using the connection helper
2. Attempts to find an existing LiveState document
3. If none exists, creates a default LiveState with:
   - `isLive: false`
   - `mount: "/stream"`
   - `title: "Initial state"`
4. Returns JSON response with LiveState data

**Success Response:**
```json
{
  "ok": true,
  "message": "Database connection successful",
  "liveState": {
    "id": "...",
    "isLive": false,
    "mount": "/stream",
    "title": "Initial state",
    "lecturer": null,
    "startedAt": null,
    "updatedAt": "2025-12-08T00:00:00.000Z"
  }
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": "Error message here"
}
```

## Testing the Database Integration

### Prerequisites

1. **MongoDB Atlas Setup** (or local MongoDB):
   - Create a free MongoDB Atlas cluster at https://www.mongodb.com/cloud/atlas
   - Get your connection string
   - Whitelist your IP address in Atlas Network Access

2. **Update Environment Variables**:
   
   Edit `online-radio/.env.local` and add your MongoDB connection string:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/online-radio?retryWrites=true&w=majority
   ```

### Running the Test

1. **Start the development server:**
   ```bash
   cd online-radio
   npm run dev
   ```

2. **Visit the test endpoint:**
   
   Open your browser and navigate to:
   ```
   http://localhost:3000/api/db-test
   ```

3. **Expected Result:**
   
   You should see a JSON response indicating successful database connection and the created/retrieved LiveState document.

4. **Verify in MongoDB:**
   
   Check your MongoDB Atlas dashboard. You should see:
   - A new database (e.g., "online-radio")
   - A collection named "livestates"
   - One document in the collection

## Technical Implementation Details

### Hot-Reload Compatible Model Exports

All models use this pattern to prevent "Cannot overwrite model" errors during development:

```typescript
const ModelName: Model<IModelName> =
  mongoose.models.ModelName ||
  mongoose.model<IModelName>("ModelName", ModelNameSchema);

export default ModelName;
```

This checks if the model already exists in Mongoose's model registry before creating a new one.

### Connection Caching Strategy

The connection helper uses a global cache to persist the connection across hot-reloads:

```typescript
declare global {
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
};
```

This prevents the common "too many connections" error in Next.js development mode.

### TypeScript Integration

All models export both:
1. **Interface** (e.g., `IAdminUser`) - For type checking
2. **Model** (e.g., `AdminUser`) - For database operations

Usage example:
```typescript
import AdminUser, { IAdminUser } from "@/lib/models/AdminUser";

// Type-safe document
const user: IAdminUser = await AdminUser.findOne({ email: "admin@example.com" });
```

## Environment Variables

The following environment variable is now **required**:

- `MONGODB_URI` - MongoDB connection string (Atlas or local)

Example:
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname?retryWrites=true&w=majority
```

## What's NOT Included (Coming in Phase 3)

- ❌ Authentication logic (JWT, bcrypt)
- ❌ Protected API routes
- ❌ Admin login functionality
- ❌ Password hashing
- ❌ Session management

## Next Steps (Phase 3)

Phase 3 will implement:
1. Admin authentication with JWT
2. Password hashing with bcrypt
3. Login API endpoint (`POST /api/admin/login`)
4. Auth helper utilities (signToken, verifyToken, getCurrentAdmin)
5. Protected route middleware
6. Wire up the `/admin/login` form to the login API

## Troubleshooting

### "MONGODB_URI is not defined" Error

**Solution:** Make sure you've added `MONGODB_URI` to your `.env.local` file and restarted the dev server.

### "Cannot overwrite model" Error

**Solution:** This should be prevented by our export pattern, but if it occurs, restart the dev server.

### Connection Timeout

**Solution:** 
- Check your MongoDB Atlas IP whitelist
- Verify your connection string is correct
- Ensure your network allows MongoDB connections (port 27017)

### TypeScript Errors

**Solution:** Run `npm run build` to check for any TypeScript compilation errors.

## Files Modified/Created

**New Files:**
- `lib/db.ts`
- `lib/models/AdminUser.ts`
- `lib/models/LiveState.ts`
- `lib/models/Schedule.ts`
- `lib/models/Episode.ts`
- `app/api/db-test/route.ts`
- `PHASE2_COMPLETE.md`

**Modified Files:**
- `package.json` (added mongoose dependency)
- `package-lock.json` (updated with mongoose and dependencies)

## Summary

Phase 2 successfully establishes the database foundation for the Islamic Online Radio application. All core models are defined with proper TypeScript types, validation rules, and Next.js hot-reload compatibility. The database connection helper ensures efficient connection management, and the test endpoint provides an easy way to verify everything is working correctly.

The application is now ready for Phase 3, where we'll add authentication and secure the admin routes.
