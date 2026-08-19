import { SignUp } from '@clerk/nextjs';
import { clerkAppearance } from '@/lib/clerk-appearance';

export default function Page() {
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
