import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { serialize, parse } from 'cookie';

const SESSION_SECRET = process.env.SESSION_SECRET || '';
const SESSION_COOKIE_NAME = 'bengals_admin_session';
const SESSION_EXPIRY = '24h';

export interface AdminUser {
  username: string;
  passwordHash: string;
  createdAt: string;
}

export interface SessionPayload {
  username: string;
  iat?: number;
  exp?: number;
}

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Verify a password against a hash
 * @param password - Plain text password
 * @param hash - Hashed password to compare against
 * @returns True if password matches
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return await bcrypt.compare(password, hash);
}

/**
 * Create a JWT session token
 * @param username - Admin username
 * @returns JWT token string
 */
export function createSession(username: string): string {
  if (!SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  const payload: SessionPayload = { username };
  return jwt.sign(payload, SESSION_SECRET, { expiresIn: SESSION_EXPIRY });
}

/**
 * Validate a JWT session token
 * @param token - JWT token string
 * @returns Session payload if valid, null if invalid
 */
export function validateSession(token: string): SessionPayload | null {
  if (!SESSION_SECRET) {
    throw new Error('SESSION_SECRET environment variable is not set');
  }

  try {
    const payload = jwt.verify(token, SESSION_SECRET) as SessionPayload;
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Create a session cookie
 * @param token - JWT token
 * @param isProduction - Whether running in production
 * @returns Serialized cookie string
 */
export function createSessionCookie(
  token: string,
  isProduction: boolean = false
): string {
  return serialize(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

/**
 * Clear the session cookie
 * @param isProduction - Whether running in production
 * @returns Serialized cookie string that clears the cookie
 */
export function clearSessionCookie(isProduction: boolean = false): string {
  return serialize(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  });
}

/**
 * Extract session token from cookie header
 * @param cookieHeader - Cookie header string
 * @returns Session token if found, null otherwise
 */
export function extractSessionFromCookie(cookieHeader: string): string | null {
  const cookies = parse(cookieHeader);
  return cookies[SESSION_COOKIE_NAME] || null;
}

/**
 * Validate admin session from cookie header
 * @param cookieHeader - Cookie header string
 * @returns Session payload if valid, null if invalid
 */
export function validateAdminSession(
  cookieHeader: string | undefined
): SessionPayload | null {
  if (!cookieHeader) {
    return null;
  }

  const token = extractSessionFromCookie(cookieHeader);
  if (!token) {
    return null;
  }

  return validateSession(token);
}
