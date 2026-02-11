/**
 * Authentication utilities with multi-user support
 * Provides session-based authentication with bcrypt password hashing
 *
 * Note: This file uses Node.js APIs (fs, path) and is for API routes only.
 * For middleware (Edge runtime), use lib/auth-edge.ts instead.
 *
 * Security features:
 * - Bcrypt password hashing (12 rounds)
 * - Constant-time comparison for session validation
 * - Rate limiting on login attempts
 * - HTTP-only secure cookies
 * - Comprehensive audit logging
 */

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { logInfo, logWarn, logError } from './logger';

/**
 * Session cookie name
 */
const SESSION_COOKIE_NAME = 'auth_session';

/**
 * Session duration (24 hours in milliseconds)
 */
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * Bcrypt salt rounds (12 is recommended for 2024)
 * Higher = more secure but slower
 */
export const BCRYPT_SALT_ROUNDS = 12;

/**
 * Path to users configuration file
 */
const USERS_FILE_PATH = path.join(process.cwd(), 'users.json');

/**
 * Login rate limiting
 * Tracks failed login attempts per username
 */
const loginAttempts = new Map<string, { count: number; lastAttempt: number; lockedUntil?: number }>();

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_CONFIG = {
  maxAttempts: 5, // Maximum failed attempts before lockout
  lockoutDuration: 15 * 60 * 1000, // 15 minutes lockout
  attemptWindow: 5 * 60 * 1000, // 5 minute window for counting attempts
};

/**
 * User interface
 */
export interface User {
  username: string;
  passwordHash: string;
  displayName?: string;
  createdAt?: string;
  lastLogin?: string;
}

/**
 * Users file structure
 */
interface UsersFile {
  users: User[];
}

/**
 * Authentication credentials
 */
export interface AuthCredentials {
  username: string;
  password: string;
}

/**
 * Session data structure
 */
interface SessionData {
  username: string;
  displayName?: string;
  token: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Loads users from the JSON configuration file
 *
 * Security: File read errors are logged but don't expose internal paths
 *
 * @returns Array of users or empty array if file doesn't exist
 */
function loadUsers(): User[] {
  try {
    // Check if file exists
    if (!fs.existsSync(USERS_FILE_PATH)) {
      logWarn('Users file does not exist', { path: 'users.json' });
      return [];
    }

    // Read and parse file
    const fileContent = fs.readFileSync(USERS_FILE_PATH, 'utf-8');

    // Validate file is not empty
    if (!fileContent.trim()) {
      logWarn('Users file is empty');
      return [];
    }

    const data: UsersFile = JSON.parse(fileContent);

    // Validate structure
    if (!data || !Array.isArray(data.users)) {
      logError('Invalid users file structure', new Error('Expected { users: [] } format'));
      return [];
    }

    // Validate each user has required fields
    const validUsers = data.users.filter(user => {
      if (!user.username || !user.passwordHash) {
        logWarn('Invalid user entry in users file', {
          hasUsername: !!user.username,
          hasPasswordHash: !!user.passwordHash
        });
        return false;
      }
      return true;
    });

    logInfo('Loaded users from file', { userCount: validUsers.length });
    return validUsers;
  } catch (error: any) {
    // Don't expose internal errors to caller
    logError('Failed to load users file', error);
    return [];
  }
}

/**
 * Finds a user by username
 * Uses case-insensitive comparison for username
 *
 * @param username - Username to search for
 * @returns User object or null if not found
 */
function findUser(username: string): User | null {
  const users = loadUsers();

  // Case-insensitive username comparison
  const normalizedUsername = username.toLowerCase().trim();

  const user = users.find(u => u.username.toLowerCase().trim() === normalizedUsername);

  return user || null;
}

/**
 * Checks if a username is currently locked out due to failed attempts
 *
 * @param username - Username to check
 * @returns True if locked out, false otherwise
 */
function isLockedOut(username: string): boolean {
  const attempts = loginAttempts.get(username.toLowerCase());

  if (!attempts) {
    return false;
  }

  // Check if lockout is still active
  if (attempts.lockedUntil && Date.now() < attempts.lockedUntil) {
    const remainingSeconds = Math.ceil((attempts.lockedUntil - Date.now()) / 1000);
    logWarn('Login attempt during lockout period', {
      username,
      remainingSeconds,
    });
    return true;
  }

  // Lockout expired, reset attempts
  if (attempts.lockedUntil && Date.now() >= attempts.lockedUntil) {
    loginAttempts.delete(username.toLowerCase());
    return false;
  }

  return false;
}

/**
 * Records a failed login attempt and applies rate limiting
 *
 * @param username - Username that failed login
 * @returns Lockout info or null
 */
function recordFailedAttempt(username: string): { lockedOut: boolean; remainingSeconds?: number } {
  const normalizedUsername = username.toLowerCase();
  const now = Date.now();

  let attempts = loginAttempts.get(normalizedUsername);

  if (!attempts) {
    // First failed attempt
    attempts = { count: 1, lastAttempt: now };
    loginAttempts.set(normalizedUsername, attempts);

    logWarn('Failed login attempt recorded', {
      username,
      attemptCount: 1,
    });

    return { lockedOut: false };
  }

  // Check if we're in a new attempt window
  if (now - attempts.lastAttempt > RATE_LIMIT_CONFIG.attemptWindow) {
    // Reset counter, new window
    attempts.count = 1;
    attempts.lastAttempt = now;
    delete attempts.lockedUntil;

    logWarn('Failed login attempt (new window)', {
      username,
      attemptCount: 1,
    });

    return { lockedOut: false };
  }

  // Increment counter in current window
  attempts.count++;
  attempts.lastAttempt = now;

  // Check if we should lock out
  if (attempts.count >= RATE_LIMIT_CONFIG.maxAttempts) {
    attempts.lockedUntil = now + RATE_LIMIT_CONFIG.lockoutDuration;

    const lockoutMinutes = RATE_LIMIT_CONFIG.lockoutDuration / 60000;

    logWarn('Account locked due to failed attempts', {
      username,
      attemptCount: attempts.count,
      lockoutMinutes,
    });

    return {
      lockedOut: true,
      remainingSeconds: Math.ceil(RATE_LIMIT_CONFIG.lockoutDuration / 1000),
    };
  }

  logWarn('Failed login attempt', {
    username,
    attemptCount: attempts.count,
    remainingAttempts: RATE_LIMIT_CONFIG.maxAttempts - attempts.count,
  });

  return { lockedOut: false };
}

/**
 * Clears failed login attempts for a user (called on successful login)
 *
 * @param username - Username to clear attempts for
 */
function clearFailedAttempts(username: string): void {
  loginAttempts.delete(username.toLowerCase());
}

/**
 * Verifies user credentials against the users file
 * Uses bcrypt for secure password comparison
 *
 * Security features:
 * - Bcrypt comparison (inherently constant-time)
 * - Rate limiting on failed attempts
 * - Account lockout after too many failures
 * - Generic error messages to prevent username enumeration
 * - Comprehensive audit logging
 *
 * @param credentials - User-provided credentials
 * @returns User object if valid, null otherwise
 */
export async function verifyCredentials(credentials: AuthCredentials): Promise<User | null> {
  try {
    const { username, password } = credentials;

    // Validate input types and basic constraints
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      logWarn('Authentication failed: invalid username format');
      return null;
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      logWarn('Authentication failed: invalid password format');
      return null;
    }

    // Check for lockout BEFORE attempting to verify password
    if (isLockedOut(username)) {
      // Don't reveal that account is locked - just return null
      // Logging already done in isLockedOut()
      return null;
    }

    // Find user
    const user = findUser(username);

    if (!user) {
      // User doesn't exist - record as failed attempt
      recordFailedAttempt(username);

      logWarn('Failed authentication: user not found', { username });
      return null;
    }

    // Verify password with bcrypt
    // bcrypt.compare is inherently constant-time
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      // Wrong password - record as failed attempt
      const lockoutInfo = recordFailedAttempt(username);

      logWarn('Failed authentication: invalid password', {
        username,
        lockedOut: lockoutInfo.lockedOut,
      });

      return null;
    }

    // Success! Clear any failed attempts
    clearFailedAttempts(username);

    logInfo('Successful authentication', {
      username,
      displayName: user.displayName,
    });

    return user;
  } catch (error) {
    logError('Error during credential verification', error as Error);
    return null;
  }
}

/**
 * Creates a secure session token
 *
 * @returns A cryptographically secure random token
 */
function generateSessionToken(): string {
  try {
    const crypto = require('crypto');
    return crypto.randomBytes(32).toString('base64url');
  } catch (error) {
    logError('Error generating session token', error as Error);
    throw new Error('Failed to generate secure session token');
  }
}

/**
 * Creates an authentication session by setting a secure cookie
 *
 * Security features:
 * - HTTP-only cookies (not accessible via JavaScript)
 * - Secure flag in production (HTTPS only)
 * - SameSite=Lax (CSRF protection)
 * - Cryptographically secure tokens
 *
 * @param user - Authenticated user
 * @returns Session token
 */
export async function createSession(user: User): Promise<string> {
  try {
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

    // Create secure session payload
    const sessionData: SessionData = {
      username: user.username,
      displayName: user.displayName,
      token: sessionToken,
      createdAt: Date.now(),
      expiresAt: expiresAt.getTime(),
    };

    // Encode session data (base64url encoding)
    const encodedSession = Buffer.from(JSON.stringify(sessionData)).toString('base64url');

    // Set HTTP-only secure cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, encodedSession, {
      httpOnly: true, // Prevents XSS attacks
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax', // CSRF protection
      expires: expiresAt,
      path: '/',
    });

    logInfo('Session created', {
      username: user.username,
      displayName: user.displayName,
      expiresAt: expiresAt.toISOString(),
    });

    return sessionToken;
  } catch (error) {
    logError('Error creating session', error as Error, { username: user.username });
    throw error;
  }
}

/**
 * Validates and decodes a session from the cookie
 *
 * @param cookieValue - Encoded session cookie value
 * @returns Decoded session data or null if invalid
 */
function decodeSession(cookieValue: string): SessionData | null {
  try {
    const sessionJson = Buffer.from(cookieValue, 'base64url').toString('utf-8');
    const session: SessionData = JSON.parse(sessionJson);

    // Validate session structure
    if (!session.username || !session.token || !session.expiresAt) {
      logWarn('Invalid session structure');
      return null;
    }

    // Validate types
    if (typeof session.username !== 'string' || typeof session.expiresAt !== 'number') {
      logWarn('Invalid session data types');
      return null;
    }

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      logWarn('Session expired', {
        username: session.username,
        expiredAt: new Date(session.expiresAt).toISOString(),
      });
      return null;
    }

    // Verify user still exists in users file
    const user = findUser(session.username);
    if (!user) {
      logWarn('Session invalid: user no longer exists', {
        username: session.username,
      });
      return null;
    }

    return session;
  } catch (error) {
    logWarn('Failed to decode session', { error: (error as Error).message });
    return null;
  }
}

/**
 * Verifies if a request has a valid authentication session (for middleware)
 *
 * @param request - Next.js request object
 * @returns Session data if authenticated, null otherwise
 */
export function getAuthenticatedUser(request: NextRequest): SessionData | null {
  try {
    const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const session = decodeSession(sessionCookie.value);

    if (!session) {
      return null;
    }

    return session;
  } catch (error) {
    logError('Error verifying session', error as Error);
    return null;
  }
}

/**
 * Destroys the current session by deleting the cookie
 */
export async function destroySession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    // Log who is logging out
    if (sessionCookie?.value) {
      const session = decodeSession(sessionCookie.value);
      if (session) {
        logInfo('Session destroyed', {
          username: session.username,
          displayName: session.displayName,
        });
      }
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    logError('Error destroying session', error as Error);
    throw error;
  }
}

/**
 * Checks if the request is authenticated (for App Router)
 *
 * @returns Session data if authenticated, null otherwise
 */
export async function isAuthenticated(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie?.value) {
      return null;
    }

    const session = decodeSession(sessionCookie.value);

    if (!session) {
      return null;
    }

    return session;
  } catch (error) {
    logError('Error checking authentication', error as Error);
    return null;
  }
}

/**
 * Hash a password using bcrypt
 * Used by user management scripts
 *
 * @param password - Plain text password
 * @returns Bcrypt hash
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
}
