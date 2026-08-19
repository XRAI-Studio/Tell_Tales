import { SignUp } from '@clerk/nextjs';
import { redirect } from 'next/navigation';
import { clerkAppearance } from '@/lib/clerk-appearance';
import { requireAuth } from '@/lib/auth-mode';

export default function Page() {
  // Public mode mounts no ClerkProvider, so these components have nothing to
  // attach to. Send visitors to the console instead of rendering a broken form.
  if (!requireAuth()) redirect('/');

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="text-center">
        <h1 className="font-legend text-4xl font-bold uppercase tracking-[0.18em] text-legend sm:text-5xl">
          Tell Tales
        </h1>
        {/* Sign-ups are invite-only, so this page is normally reached from an
            invitation link rather than browsed to. */}
        <p className="mt-2 text-sm text-legend-dim">Accept your invitation to join.</p>
      </div>
      <SignUp appearance={clerkAppearance} />
    </main>
  );
}
