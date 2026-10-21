/**
 * Shared chrome for the two legal pages, so the privacy policy and the terms
 * cannot drift apart visually. Both are plain server components — no state, no
 * Clerk — so they render identically whether or not the login is switched on.
 */

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="font-legend text-xl font-semibold uppercase tracking-[0.14em] text-legend">
        {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-legend-dim">{children}</div>
    </section>
  );
}

/** Emphasis inside legal prose, pitched brighter than the body text. */
export function Term({ children }: { children: React.ReactNode }) {
  return <strong className="text-legend">{children}</strong>;
}

export function LegalLink({ href, children }: { href: string; children: React.ReactNode }) {
  const external = href.startsWith('http');
  return (
    <a
      href={href}
      className="text-legend underline decoration-edge underline-offset-4 transition hover:text-lamp-amber"
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
    >
      {children}
    </a>
  );
}
