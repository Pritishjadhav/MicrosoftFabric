/**
 * Next.js Middleware / Proxy
 *
 * Protects routes that require authentication.
 * Unauthenticated users are redirected to /login.
 *
 * Next.js 16+ uses "proxy" exports instead of "middleware".
 * The withAuth helper from next-auth handles session checking.
 */

export { default } from 'next-auth/middleware';

export const config = {
  matcher: [
    // Protect all dashboard routes
    '/dashboard/:path*',
    // Note: /login, /api/auth/*, _next/static, and _next/image are excluded by default
    // when using next-auth middleware
  ],
};
