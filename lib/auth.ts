import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "./config";

/**
 * PRODUCTION-GRADE AUTHENTICATION UTILITIES
 * 
 * Implements:
 * - Separate access tokens (15min) and refresh tokens (7day)
 * - Token revocation via version tracking
 * - Secure JWT verification with type checking
 * - Compliance with industry standards (OAuth 2.0 recommendations)
 */

// Access Token payload (short-lived)
export interface AccessTokenPayload {
  userId: string;
  role: string;
  email: string;
  tokenType: 'access';
}

// Refresh Token payload (long-lived)
export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
  tokenType: 'refresh';
}

// Verified token result
export interface VerifiedAccessToken extends AccessTokenPayload {
  iat: number;
  exp: number;
}

export interface VerifiedRefreshToken extends RefreshTokenPayload {
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
 * Sign a short-lived access token (15 minutes)
 * @param payload - The payload to include in the token
 * @returns The signed JWT access token
 * @throws Error if JWT_SECRET is not configured
 */
export function signAccessToken(payload: AccessTokenPayload): string {
  if (!config.jwtSecret) {
    throw new Error(
      "JWT_SECRET is not defined in environment variables. Cannot sign access token."
    );
  }

  return jwt.sign(
    {
      ...payload,
      tokenType: 'access',
    },
    config.jwtSecret,
    {
      expiresIn: '15m',
      issuer: 'almanhaj-radio',
      subject: payload.userId,
      algorithm: 'HS256',
    }
  );
}

/**
 * Sign a long-lived refresh token (7 days)
 * @param userId - The user ID
 * @param tokenVersion - The current token version for revocation support
 * @returns The signed JWT refresh token
 * @throws Error if JWT_SECRET is not configured
 */
export function signRefreshToken(userId: string, tokenVersion: number): string {
  if (!config.jwtSecret) {
    throw new Error(
      "JWT_SECRET is not defined in environment variables. Cannot sign refresh token."
    );
  }

  return jwt.sign(
    {
      userId,
      tokenVersion,
      tokenType: 'refresh',
    } as RefreshTokenPayload,
    config.jwtSecret,
    {
      expiresIn: '7d',
      issuer: 'almanhaj-radio',
      subject: userId,
      algorithm: 'HS256',
    }
  );
}

/**
 * Issue both access and refresh tokens
 * @param payload - Access token payload
 * @param userId - User ID for refresh token
 * @param tokenVersion - Token version for revocation
 * @returns Object with both tokens
 */
export function issueTokens(
  payload: Omit<AccessTokenPayload, 'tokenType'>,
  tokenVersion: number
): { accessToken: string; refreshToken: string } {
  const accessToken = signAccessToken({
    ...payload,
    tokenType: 'access',
  });

  const refreshToken = signRefreshToken(payload.userId, tokenVersion);

  return { accessToken, refreshToken };
}

/**
 * Verify and decode an access token
 * @param token - The JWT access token to verify
 * @returns The decoded token payload if valid, null if invalid or expired
 */
export function verifyAccessToken(token: string): VerifiedAccessToken | null {
  if (!config.jwtSecret) {
    console.error("JWT_SECRET is not defined. Cannot verify access token.");
    return null;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: 'almanhaj-radio',
      algorithms: ['HS256'],
    }) as VerifiedAccessToken;

    // Verify token type
    if (decoded.tokenType !== 'access') {
      console.error('Invalid token type for access token');
      return null;
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.debug("Invalid access token:", error.message);
    } else if (error instanceof jwt.TokenExpiredError) {
      console.debug("Access token expired:", error.message);
    }
    return null;
  }
}

/**
 * Verify and decode a refresh token
 * @param token - The JWT refresh token to verify
 * @returns The decoded token payload if valid, null if invalid or expired
 */
export function verifyRefreshToken(token: string): VerifiedRefreshToken | null {
  if (!config.jwtSecret) {
    console.error("JWT_SECRET is not defined. Cannot verify refresh token.");
    return null;
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret, {
      issuer: 'almanhaj-radio',
      algorithms: ['HS256'],
    }) as VerifiedRefreshToken;

    // Verify token type
    if (decoded.tokenType !== 'refresh') {
      console.error('Invalid token type for refresh token');
      return null;
    }

    return decoded;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      console.debug("Invalid refresh token:", error.message);
    } else if (error instanceof jwt.TokenExpiredError) {
      console.debug("Refresh token expired:", error.message);
    }
    return null;
  }
}

/**
 * DEPRECATED: Old single-token function kept for backward compatibility
 * Use signAccessToken() or issueTokens() instead
 * @deprecated Use issueTokens() or signAccessToken() instead
 */
export function signAuthToken(payload: AccessTokenPayload): string {
  console.warn('DEPRECATED: signAuthToken() will be removed. Use signAccessToken() instead.');
  return signAccessToken(payload);
}

/**
 * DEPRECATED: Old single-token verification function
 * Use verifyAccessToken() instead
 * @deprecated Use verifyAccessToken() instead
 */
export function verifyAuthToken(token: string): { userId: string; role: string; email: string } | null {
  console.warn('DEPRECATED: verifyAuthToken() will be removed. Use verifyAccessToken() instead.');
  const decoded = verifyAccessToken(token);
  if (!decoded) return null;
  return {
    userId: decoded.userId,
    role: decoded.role,
    email: decoded.email,
  };
}
