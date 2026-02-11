/**
 * Edge-compatible authentication utilities
 * Used by middleware (which runs in Edge runtime)
 *
 * Note: This is a subset of lib/auth.ts that doesn't use Node.js APIs
 */

import { NextRequest } from 'next/server';

/**
 * Session cookie name (must match lib/auth.ts)
 */
const SESSION_COOKIE_NAME = 'auth_session';

/**
 * Session data structure
 */
export interface SessionData {
  username: string;
  displayName?: string;
  token: string;
  createdAt: number;
  expiresAt: number;
}

/**
 * Validates and decodes a session from the cookie
 * Edge-compatible version (no file system access)
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
      return null;
    }

    // Validate types
    if (typeof session.username !== 'string' || typeof session.expiresAt !== 'number') {
      return null;
    }

    // Check if session is expired
    if (Date.now() > session.expiresAt) {
      return null;
    }

    // Note: We don't check if user exists in users.json here
    // because Edge runtime cannot access file system.
    // This check is done in API routes which run in Node.js runtime.

    return session;
  } catch (error) {
    return null;
  }
}

/**
 * Verifies if a request has a valid authentication session
 * Edge-compatible version for use in middleware
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
    return null;
  }
}
