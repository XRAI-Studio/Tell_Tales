/**
 * Whether the app is gated behind a Clerk login.
 *
 * Off by default so Tell Tales can run publicly inside its orb on
 * scott.macscott.net without a session to carry across the iframe boundary.
 * The whole Clerk layer stays wired and tested behind this flag.
 *
 * Setting this to true is NOT sufficient on its own, despite what a single
 * boolean implies. Clerk development keys only work on localhost: against a
 * real domain they make auth.protect() rewrite to a 404, with the reason in
 * X-Clerk-Auth-Reason: dev-browser-missing. A custom domain, a Clerk production
 * instance, its DNS records and the pk_live/sk_live keys all have to be in
 * place first — the sequence is in the README, under "The login is built, and
 * currently switched off".
 *
 * TURN THIS ON BEFORE ADDING PAID AI CREDITS. While the gateway balance is
 * free-tier credit, an open endpoint risks a few dollars and then stops. Paid
 * credit removes that ceiling, and an unauthenticated generation route becomes
 * an open tab.
 *
 * NEXT_PUBLIC_ so the client can match the server's behaviour in what it
 * renders. The value is not a secret; enforcement is server-side, where a
 * client cannot reach it.
 */
export function requireAuth(): boolean {
  return process.env.NEXT_PUBLIC_REQUIRE_AUTH === 'true';
}
