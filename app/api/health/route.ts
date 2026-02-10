import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET /api/health
 * Health check endpoint for monitoring and uptime checks
 */
export async function GET() {
  try {
    // Check if required environment variables are set
    const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);

    const health = {
      status: hasApiKey ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      checks: {
        apiKeyConfigured: hasApiKey,
      },
    };

    const statusCode = hasApiKey ? 200 : 503;

    return NextResponse.json(health, {
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Health check error:', error);
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
}
