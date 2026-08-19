import { SignIn } from '@clerk/nextjs';
import { clerkAppearance } from '@/lib/clerk-appearance';

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-16">
      <div className="text-center">
        <h1 className="font-legend text-4xl font-bold uppercase tracking-[0.18em] text-legend sm:text-5xl">
          Tell Tales
        </h1>
        <p className="mt-2 text-sm text-legend-dim">Sign in to start telling stories.</p>
      </div>
      <SignIn appearance={clerkAppearance} />
    </main>
  );
}
