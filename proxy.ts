import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Next.js 16 renamed Middleware to Proxy; the file must be `proxy.ts` at the
 * project root. Clerk's docs still say `middleware.ts`, which on this version
 * would simply never run.
 *
 * This is an optimistic gate only — it keeps signed-out visitors from landing
 * on the console. The generation route does its own `auth()` check, because
 * per Next's own guidance a proxy must not be the sole authorization boundary.
 */
const isPublic = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);
const isApi = createRouteMatcher(['/api(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (isPublic(req)) return;

  // API routes are deliberately not redirected. `auth.protect()` answers with a
  // 307 to an HTML sign-in page, which a fetch() cannot act on — it surfaces as
  // a bizarre parse error rather than "you are signed out". Letting these fall
  // through means the route handler's own auth() check returns a clean 401 JSON.
  if (isApi(req)) return;

  await auth.protect();
});

export const config = {
  matcher: [
    // Everything except Next internals and static files.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes.
    '/(api|trpc)(.*)',
  ],
};
