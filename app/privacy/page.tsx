import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalSection, Term } from '@/components/LegalSection';

export const metadata: Metadata = {
  title: 'Privacy Policy — Tell Tales',
  description: 'What Tell Tales does, and does not do, with your data.',
};

/**
 * Required by Google for the OAuth consent screen, and by anyone who reasonably
 * wants to know where their words go.
 *
 * Every claim here is checkable against the code: there is no analytics
 * package in package.json, no database or filesystem write anywhere in app/ or
 * lib/, and the only persistence is localStorage in lib/state/story-history.ts.
 * If any of that changes, this page has to change with it.
 */
const LAST_UPDATED = '21 October 2026';

const CONTACT_EMAIL = 'scottmacscott@gmail.com';

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-24 pt-8 sm:px-6">
      <header className="border-b border-edge pb-5">
        <Link
          href="/"
          className="text-xs uppercase tracking-[0.18em] text-legend-faint transition hover:text-lamp-amber"
        >
          &larr; Tell Tales
        </Link>
        <h1 className="mt-3 font-legend text-4xl font-bold uppercase tracking-[0.18em] text-legend">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-legend-dim">Last updated {LAST_UPDATED}</p>
      </header>

      <p className="mt-8 text-sm leading-relaxed text-legend-dim">
        Tell Tales is a small, privately run tool for generating stories. It is not a business, it
        sells nothing, and it has no interest in building a profile of you. This page describes
        exactly what happens to the data you give it.
      </p>

      <LegalSection title="What is collected">
        <p>
          <Term>If you sign in</Term>, authentication is handled by
          Clerk. Depending on how you sign in, Clerk receives your email address and, where you use
          Google, the name and profile picture on your Google account. Tell Tales uses this only to
          know who you are and to keep you signed in. It is not used for marketing and is never sold
          or shared.
        </p>
        <p>
          <Term>When you generate a story</Term>, the settings you chose
          — plot, characters, tone, and the rest — are sent to a language model to be turned into
          prose. Fact mode additionally sends the draft to a search-capable model for verification,
          which means the content of that draft reaches a provider that searches the web.
        </p>
        <p>
          <Term>Your IP address</Term> is held briefly in memory to
          enforce rate limits, so one visitor cannot exhaust the service for everyone. It is kept
          only for the length of the rate-limit window, is never written to disk, and is not linked
          to your account or your stories.
        </p>
      </LegalSection>

      <LegalSection title="What is not collected">
        <p>
          There is no analytics, no tracking pixels, no advertising technology, and no third-party
          scripts of that kind anywhere in this application. Nobody is measuring what you click.
        </p>
        <p>
          Your stories are <Term>not stored on any server</Term>. There
          is no database. Generated stories are streamed to your browser and saved only in that
          browser&rsquo;s local storage, on your own device. Clearing your browser data deletes them
          permanently, and no copy exists anywhere else.
        </p>
      </LegalSection>

      <LegalSection title="Voice input">
        <p>
          The microphone button, where your browser offers one, uses the Web Speech API. This is a
          browser feature rather than something this application implements. Be aware that in
          Chrome and some other browsers, the audio is sent to the browser vendor&rsquo;s servers
          for transcription — Google&rsquo;s, in Chrome&rsquo;s case — and that is outside this
          application&rsquo;s control.
        </p>
        <p>
          Nothing is recorded unless you press the microphone button, and the audio is never sent to
          or stored by Tell Tales.
        </p>
      </LegalSection>

      <LegalSection title="Who else is involved">
        <p>These are the third parties that necessarily see some data, and why:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <Term>Clerk</Term> — authentication. Holds your account
            record.{' '}
            <a
              href="https://clerk.com/legal/privacy"
              className="text-legend underline decoration-edge underline-offset-4 transition hover:text-lamp-amber"
              target="_blank"
              rel="noreferrer noopener"
            >
              Clerk&rsquo;s privacy policy
            </a>
            .
          </li>
          <li>
            <Term>Vercel</Term> — hosting, and the AI Gateway that story
            requests pass through. Vercel keeps standard server request logs.{' '}
            <a
              href="https://vercel.com/legal/privacy-policy"
              className="text-legend underline decoration-edge underline-offset-4 transition hover:text-lamp-amber"
              target="_blank"
              rel="noreferrer noopener"
            >
              Vercel&rsquo;s privacy policy
            </a>
            .
          </li>
          <li>
            <Term>Language model providers</Term> — reached through the
            gateway, these receive your story settings in order to write the story, and in fact mode
            the draft as well.
          </li>
          <li>
            <Term>Google</Term> — only if you choose to sign in with
            Google, and only to confirm your identity.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          The only cookie set is the session cookie that keeps you signed in, placed by Clerk. There
          are no advertising or analytics cookies. If sign-in is turned off, the application sets no
          cookies at all.
        </p>
      </LegalSection>

      <LegalSection title="Keeping and deleting your data">
        <p>
          Stories live in your browser, so you delete them by clearing your browser data or using
          the controls in the app. No request to anyone is needed, because nobody else holds them.
        </p>
        <p>
          Your account record is kept by Clerk for as long as the account exists. To have it
          deleted, email the address below and it will be removed, along with anything connected to
          it.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          Tell Tales is not directed at children under 13 and does not knowingly collect their
          personal information.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          If this policy changes, the date at the top changes with it. Material changes to what is
          collected will be reflected here before they take effect.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions, or a deletion request:{' '}
          <a
            href={`mailto:${CONTACT_EMAIL}`}
            className="text-legend underline decoration-edge underline-offset-4 transition hover:text-lamp-amber"
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </LegalSection>
    </main>
  );
}
