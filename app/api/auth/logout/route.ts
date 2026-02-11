import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';
import { logInfo, logError, generateRequestId } from '@/lib/logger';

export const runtime = 'nodejs';

/**
 * POST /api/auth/logout
 * Destroys the current session
 */
export async function POST() {
  const requestId = generateRequestId();

  try {
    await destroySession();

    logInfo('User logged out', { requestId });

    return NextResponse.json(
      { success: true, message: 'Logout successful' },
      { status: 200 }
    );
  } catch (error: any) {
    logError('Logout error', error, { requestId });
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
