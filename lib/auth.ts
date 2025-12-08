import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "./config";

/**
 * Authentication utilities for admin users
 * Handles password hashing, JWT signing/verification
 */

// JWT payload type
export interface AuthTokenPayload {
  userId: string;
  role: string;
  email: string;
}

// JWT verification result
export interface VerifiedToken extends AuthTokenPayload {
  iat: number;
  exp: number;
}

/**
 * Hash a plain text password using bcrypt
 * @param plainPassword - The plain text password to hash
 * @returns Promise resolving to the hashed password
 */
export async function hashPassword(plainPassword: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(plainPassword, saltRounds);
}

/**
 * Verify a plain text password against a hashed password
 * @param plainPassword - The plain text password to verify
 * @param hashedPassword - The hashed password to compare against
 * @returns Promise resolving to true if passwords match, false otherwise
 */
export async function verifyPassword(
  plainPassword: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Sign an authentication token (JWT)
 * @param payload - The payload to include in the token
 * @returns The signed JWT token
 * @throws Error if JWT_SECRET is not configured
 */
export function signAuthToken(payload: AuthTokenPayload): string {
  if (!config.jwtSecret) {
    throw new Error(
      "JWT_SECRET is not defined in environment variables. Cannot sign auth token."
    );
  }

  // Sign token with 7 days expiry
  return jwt.sign(payload, config.jwtSecret, {
    expiresIn: "7d",
  });
}

/**
 * Verify and decode an authentication token (JWT)
 * @param token - The JWT token to verify
 * @returns The decoded token payload if valid, null if invalid or expired
 */
export function verifyAuthToken(token: string): AuthTokenPayload | null {
  if (!config.jwtSecret) {
    console.error("JWT_SECRET is not defined. Cannot verify auth token.");
    return null;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as VerifiedToken;
    
    // Return only the payload fields we care about
    return {
      userId: decoded.userId,
      role: decoded.role,
      email: decoded.email,
    };
  } catch (error) {
    // Token is invalid or expired
    if (error instanceof jwt.JsonWebTokenError) {
      console.error("Invalid JWT token:", error.message);
    } else if (error instanceof jwt.TokenExpiredError) {
      console.error("JWT token expired:", error.message);
    }
    return null;
  }
}
