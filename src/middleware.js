import { NextResponse } from 'next/server';
import { verifyToken, getTokenFromCookies } from '@/lib/auth';

// Define which paths should NOT be redirected/intercepted
const PUBLIC_PATHS = ['/login', '/register'];

export async function middleware(req) {
  const { pathname } = req.nextUrl;

  // 1. Bypass public API endpoints and static assets
  if (
    pathname.startsWith('/api/webhook') ||
    pathname.startsWith('/api/calls/webhook') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/register') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.startsWith('/api/uploads') ||
    pathname.startsWith('/api/cron')
  ) {
    return NextResponse.next();
  }

  // 2. Read session token from cookie
  const token = getTokenFromCookies(req);
  const user = token ? await verifyToken(token) : null;

  // 3. Route guarding logic
  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));

  if (!user && !isPublicPath) {
    // If not authenticated and trying to access a protected page, redirect to /login
    const loginUrl = new URL('/login', req.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isPublicPath) {
    // If authenticated and trying to access login or register, redirect to dashboard
    return NextResponse.redirect(new URL('/', req.url));
  }

  // Allow proceeding for all other cases
  return NextResponse.next();
}

// Next.js middleware config to specify matching paths
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. _next/static (static files)
     * 2. _next/image (image optimization files)
     * 3. favicon.ico (favicon file)
     * 4. Any file under public/ (contains robots.txt, icons, uploads, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
};
