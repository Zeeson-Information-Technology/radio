import mongoose from "mongoose";
import { config } from "./config";

/**
 * MongoDB connection helper with caching for Next.js App Router
 * Prevents creating multiple connections during hot-reload in development
 */

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

// Use global to persist connection across hot-reloads in development
declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || {
  conn: null,
  promise: null,
};

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  // Return existing connection if available
  if (cached.conn) {
    console.log("🔍 DB: Using cached connection");
    return cached.conn;
  }

  // Check for MongoDB URI
  if (!config.mongodbUri) {
    console.error("❌ DB: MONGODB_URI is not defined");
    throw new Error(
      "MONGODB_URI is not defined in environment variables. Please add it to .env.local"
    );
  }
  
  console.log("🔍 DB: MongoDB URI found, connecting...");

  // Create new connection promise if not exists
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(config.mongodbUri, opts);
  }

  try {
    console.log("🔍 DB: Awaiting connection promise...");
    cached.conn = await cached.promise;
    console.log("✅ DB: Connected successfully");
  } catch (e) {
    console.error("❌ DB: Connection failed", e);
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}
