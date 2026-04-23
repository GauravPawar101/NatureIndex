import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import createIntlMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { routing } from './src/i18n/routing';

type Role = 'admin' | 'author' | 'reader';

function normalizeRole(value: unknown): Role {
  const raw = String(value || '').toLowerCase();
  if (raw === 'admin' || raw === 'author' || raw === 'reader') return raw;
  return 'reader';
}

function getRoleFromClaims(claims: unknown): Role {
  const c = (claims || {}) as any;
  return normalizeRole(
    c?.publicMetadata?.role ??
      c?.public_metadata?.role ??
      c?.metadata?.role ??
      c?.user?.publicMetadata?.role
  );
}

const isBlogRoute = createRouteMatcher(['/blog(.*)', '/en/blog(.*)', '/hi/blog(.*)']);
const isDashboardRoute = createRouteMatcher([
  '/dashboard(.*)',
  '/create-post(.*)',
  '/new-post(.*)',
  '/en/dashboard(.*)',
  '/en/create-post(.*)',
  '/en/new-post(.*)',
  '/hi/dashboard(.*)',
  '/hi/create-post(.*)',
  '/hi/new-post(.*)',
]);
const isAdminRoute = createRouteMatcher(['/admin(.*)', '/en/admin(.*)', '/hi/admin(.*)']);

const intlMiddleware = createIntlMiddleware(routing);

export default clerkMiddleware(async (auth, req) => {
  const pathname = req.nextUrl.pathname;

  // Avoid locale redirects for API routes.
  const shouldRunIntl = !pathname.startsWith('/api') && !pathname.startsWith('/trpc');
  const intlResponse = shouldRunIntl ? intlMiddleware(req) : NextResponse.next();

  // If next-intl wants to redirect (e.g. /blog -> /en/blog), do that first.
  if (shouldRunIntl) {
    const location = intlResponse.headers.get('location');
    if (location) return intlResponse;
  }

  // Anyone can read /blog pages (no auth required).
  if (isBlogRoute(req)) {
    return intlResponse;
  }

  // Protect author/admin-only areas.
  if (isDashboardRoute(req) || isAdminRoute(req)) {
    const { userId, sessionClaims, redirectToSignIn } = await auth();

    if (!userId) {
      return redirectToSignIn({ returnBackUrl: req.url });
    }

    const role = getRoleFromClaims(sessionClaims);

    if (isAdminRoute(req)) {
      if (role !== 'admin') {
        return new NextResponse('Forbidden', { status: 403 });
      }
      return intlResponse;
    }

    // dashboard/create-post/new-post
    if (role !== 'admin' && role !== 'author') {
      return new NextResponse('Forbidden', { status: 403 });
    }
    return intlResponse;
  }

  // Default: allow.
  return intlResponse;
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    '/((?!api|trpc|_next|.*\\..*).*)',
  ],
};
