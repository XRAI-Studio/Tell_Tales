/**
 * Dresses Clerk's components in the console's own palette, so signing in
 * doesn't drop the user onto a stock white form in the middle of a graphite
 * control desk. Values mirror the tokens in app/globals.css.
 *
 * Deliberately untyped: Core 3 dropped the public `Appearance` export, and the
 * shape is structurally checked where it is passed to Clerk's components.
 */
export const clerkAppearance = {
  variables: {
    colorPrimary: '#f2a93b',
    colorBackground: '#26221c',
    colorText: '#d5cbb8',
    colorTextSecondary: '#8d8474',
    colorInputBackground: '#1e1b16',
    colorInputText: '#d5cbb8',
    colorDanger: '#e2503c',
    colorSuccess: '#8bb46a',
    borderRadius: '2px',
  },
  elements: {
    card: {
      border: '1px solid #524a3d',
      boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
    },
    headerTitle: {
      fontFamily: 'var(--font-barlow-condensed), sans-serif',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    },
    formButtonPrimary: {
      fontFamily: 'var(--font-barlow-condensed), sans-serif',
      letterSpacing: '0.16em',
      textTransform: 'uppercase',
      fontWeight: 700,
      color: '#17150f',
    },
  },
} as const;
