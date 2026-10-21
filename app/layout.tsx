import type { Metadata } from 'next';
import Link from 'next/link';
import { ClerkProvider } from '@clerk/nextjs';
import { requireAuth } from '@/lib/auth-mode';
import { Barlow, Barlow_Condensed, Newsreader, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const barlow = Barlow({
  variable: '--font-barlow',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
});

const barlowCondensed = Barlow_Condensed({
  variable: '--font-barlow-condensed',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
});

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
});

export const metadata: Metadata = {
  title: 'Tell Tales',
  description: 'A console for building any story, one knob at a time.',
};

// Typed explicitly rather than with Next's generated `LayoutProps<'/'>`, which
// only exists after a build has written .next/types — so a clean clone would
// otherwise fail to typecheck.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${barlow.variable} ${barlowCondensed.variable} ${newsreader.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Skipped in public mode so the embedded orb does not load Clerk's
            client bundle for a session it will never have. */}
        {requireAuth() ? <ClerkProvider>{children}</ClerkProvider> : children}
        {/* In the layout rather than the console so it is also present on the
            sign-in page, which is where Google's consent flow sends people. */}
        <footer className="mt-auto flex items-center justify-center gap-5 border-t border-edge px-4 py-4 sm:px-6">
          <Link
            href="/privacy"
            className="text-xs uppercase tracking-[0.18em] text-legend-faint transition hover:text-lamp-amber"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-xs uppercase tracking-[0.18em] text-legend-faint transition hover:text-lamp-amber"
          >
            Terms
          </Link>
        </footer>
      </body>
    </html>
  );
}
