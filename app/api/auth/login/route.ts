import { NextRequest, NextResponse } from 'next/server';
import { verifyCredentials, createSession } from '@/lib/auth';
import { logInfo, logWarn, generateRequestId } from '@/lib/logger';
import { sanitizeInput, isValidUtf8 } from '@/lib/validation';

export const runtime = 'nodejs';

/**
 * POST /api/auth/login
 * Authenticates a user and creates a session
 *
 * Security features:
 * - Input validation and sanitization
 * - UTF-8 encoding validation
 * - Rate limiting (handled in verifyCredentials)
 * - Account lockout after failed attempts
 * - Generic error messages to prevent username enumeration
 */
export async function POST(req: NextRequest) {
  const requestId = generateRequestId();

  try {
    // Parse request body
    const body = await req.json();
    let { username, password } = body;

    // Validate input types
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
      logWarn('Login attempt with missing username', { requestId });
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string' || password.length === 0) {
      logWarn('Login attempt with missing password', { requestId });
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      );
    }

    // Validate UTF-8 encoding
    if (!isValidUtf8(username) || !isValidUtf8(password)) {
      logWarn('Login attempt with invalid encoding', { requestId });
      return NextResponse.json(
        { error: 'Invalid character encoding' },
        { status: 400 }
      );
    }

    // Sanitize username (but not password to preserve exact input)
    username = sanitizeInput(username);

    // Validate length constraints
    if (username.length < 3 || username.length > 100) {
      logWarn('Login attempt with invalid username length', { requestId, username });
      // Generic error to prevent username enumeration
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (password.length < 8 || password.length > 128) {
      logWarn('Login attempt with invalid password length', { requestId, username });
      // Generic error to prevent username enumeration
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify credentials (includes rate limiting and account lockout)
    const user = await verifyCredentials({ username, password });

    if (!user) {
      // Generic error message - don't reveal whether user exists or password is wrong
      // Detailed logging already done in verifyCredentials()
      logWarn('Failed login attempt', { requestId, username });
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create session
    try {
      await createSession(user);

      logInfo('User logged in successfully', {
        requestId,
        username: user.username,
        displayName: user.displayName,
      });

      return NextResponse.json(
        {
          success: true,
          message: 'Login successful',
          username: user.username,
          displayName: user.displayName,
        },
        { status: 200 }
      );
    } catch (error) {
      logWarn('Failed to create session', {
        requestId,
        username: user.username,
        error: (error as Error).message,
      });
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: 500 }
      );
    }
  } catch (error: any) {
    logWarn('Login request error', { requestId, error: error.message });
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}
