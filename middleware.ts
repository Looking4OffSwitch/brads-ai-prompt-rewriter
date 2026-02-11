import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-edge';

/**
 * Middleware to enforce authentication on protected routes
 * Redirects unauthenticated users to the login page
 *
 * Note: Uses auth-edge.ts (Edge runtime compatible) instead of auth.ts
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip authentication check for public routes
  const publicPaths = [
    '/login',
    '/api/auth/login',
    '/api/auth/logout',
    '/api/health',
    '/_next', // Next.js internals
    '/favicon.ico',
    '/public',
  ];

  // Check if the path is public
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Verify authentication
  const user = getAuthenticatedUser(request);

  if (!user) {
    // User is not authenticated - redirect to login
    const loginUrl = new URL('/login', request.url);
    // Add return URL to redirect back after login
    loginUrl.searchParams.set('returnTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // User is authenticated - allow the request to proceed
  return NextResponse.next();
}

/**
 * Specify which routes should be processed by this middleware
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
