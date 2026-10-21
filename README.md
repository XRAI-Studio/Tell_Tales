# Tell Tales

A console for building any story. Set the knobs — plot, setting, cast, tone, pacing — or let the
machine set them for you, then generate.

## Running it

```bash
npm install
npm run dev
```

It works immediately with no API key. Without one the app runs in **mock mode**: the generation
route streams a story assembled from your own compiled payload, so every knob is visibly wired
through end to end. Nothing is sent anywhere.

To generate with a real model, put a [Vercel AI Gateway](https://vercel.com/docs/ai-gateway) key in
`.env.local`:

```
AI_GATEWAY_API_KEY=your-key-here
STORY_MODEL=
```

### Choosing a model

`STORY_MODEL` takes any gateway model string and defaults to `openai/gpt-oss-120b`.

`FACT_CHECK_MODEL` is the verifier used by fact mode, defaulting to
`perplexity/sonar`. It is deliberately a *different* model from the storyteller, for
two reasons. It searches the web while answering, so it checks dates, people and events
against sources rather than against what it happens to remember — which is what the
spec's "fact-checking validation step" actually requires. And it has to hold to a JSON
schema, which `gpt-oss-120b` cannot: `generateObject` fails against it outright, which
is why fact mode used to return every draft unverified.

Whatever you set it to needs both properties. If the verifier fails, the story is still
delivered with a visible "unverified" notice rather than being thrown away.

Vercel's **free tier rate-limits most models per short window**, independently of your credit
balance — a $5 promotional balance does not lift the limits, only purchased credits do. As of
writing, `openai/gpt-oss-120b` and `alibaba/qwen-3-32b` are usable on the free tier; the stronger
storytellers, `anthropic/claude-sonnet-5` among them, return 429 or "no access" until you top up.

Two consequences worth knowing:

- If you hit a 429, it clears on its own in a couple of minutes. The app shows the gateway's own
  message rather than hiding it.
- Fact mode makes up to three model calls — draft, verify, and a revise pass only if the verifier
  found something — where fiction makes one, and the verify call is a web search. That is two or
  three chances to meet a rate limit, so fact mode is the first thing to feel unreliable on the
  free tier. It fails soft either way: if the verifier cannot complete, you get the draft with a
  visible notice that it is unverified rather than losing the story.

```bash
npm test          # 107 unit tests over the pure logic
npm run build     # production build
npx eslint .      # lint
```

## How it works

**The knobs.** [lib/story/fields.ts](lib/story/fields.ts) is the single registry of all 16 fields.
It drives the layout, the input type, and validation — add a field there and it appears on the
console with a working Auto-Generate button.

**Auto-Generate.** Every field has one, and every one is instant: suggestions come from curated
local tables in [lib/story/suggestions.ts](lib/story/suggestions.ts), never a network call, so
clicking repeatedly feels like a slot machine rather than a wait.
[cycler.ts](lib/story/cycler.ts) guarantees the value always visibly changes.

**Nothing is ever an error.** Pressing *Tell the story* with gaps opens a prompt that walks them one
at a time, offering a roll or your own answer, and starts generating as soon as the last one is
accepted.

**Three field states, not two.** A field is `unvisited`, `skipped`, or `set`
([schema.ts](lib/story/schema.ts)). The distinction reaches the model: a skipped optional field is
sent as an explicit `null`, an unvisited one is omitted. One records a decision, the other records
an absence.

**Fact vs. fiction.** Fiction generates in one streamed pass at temperature 0.9. Fact drops to 0.2
and runs draft → verify → revise, with the stage lamps showing where it is; the verifier returns
structured issues and they are shown alongside the finished story.

**The system prompt** in [lib/story/prompt.ts](lib/story/prompt.ts) is reproduced verbatim from the
product spec and should not be paraphrased — there are tests asserting its sections survive.

## Before you deploy this

The generation route spends real money per call. It is safe to run locally as-is; **exposing it
publicly needs more than what ships here.**

What is already in place ([lib/server/guards.ts](lib/server/guards.ts)):

- Per-IP sliding-window request limit and concurrency cap, plus a global concurrency cap.
- A 64 KB request body ceiling, enforced before the JSON is parsed.
- A strict, fully bounded request schema — every string and array has a maximum.
- **The caller cannot choose how large a generation it buys.** The client sends a `lengthId`; the
  server resolves the word target and token budget from its own table. No cost parameter is on the
  wire.
- Cancellation propagates: closing the tab or pressing Stop aborts every model call, including the
  later stages of the fact pipeline. Measured, an aborted run ends in ~180 ms against ~13 s for a
  full one.

### The login is built, and currently switched off

A full Clerk layer ships here: [proxy.ts](proxy.ts) gates the pages, the generation route checks
`auth()` for itself, and the rate limiter keys on the verified user id when there is one. It sits
behind `NEXT_PUBLIC_REQUIRE_AUTH`, which defaults to **off**, because the deployed app runs publicly
inside an iframe on an apps site where no session carries across the boundary.

Turning it back on is **not** just the one env var, despite what the flag's name suggests. Clerk
development keys (`pk_test_...`) only work on localhost; pointed at a real domain they make
`auth.protect()` rewrite to a 404 with `X-Clerk-Auth-Reason: dev-browser-missing`. The whole
sequence is:

1. Put the app on a custom domain whose DNS you control. This one is on
   `telltales.macscott.net`.
2. Create a Clerk **production** instance for that domain and add every DNS record it asks for,
   then wait until Clerk reports them verified *and* SSL issued.
3. Point the Vercel environment at the production keys (`pk_live_...` / `sk_live_...`). Clerk here
   arrived through the Vercel Marketplace, so check whether the integration has already updated
   them before adding anything by hand — a manual duplicate of an integration-managed variable
   conflicts with it.
4. Set `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`.
   Without them the SDK derives an Account Portal address from the publishable key — `@clerk/shared`
   rewrites `clerk.example.com` to `accounts.example.com` — and `auth.protect()` sends signed-out
   visitors to Clerk's hosted pages, leaving this app's own sign-in route unreachable.
5. Give yourself a user on the production instance *before* restricting sign-ups. Development-instance
   users do not carry over, so restricting first locks the owner out along with everyone else.
6. Restrict sign-ups in the Clerk dashboard, unless you want anyone signing in.
7. Set `NEXT_PUBLIC_REQUIRE_AUTH=true`.
8. Redeploy. Every `NEXT_PUBLIC_*` value above is inlined at build time, so none of them change the
   running app until a new build goes out.

Step 7 without step 2 gets you a 404 for every visitor.

Two things to settle once it is on. If the app is embedded, check that the login survives the
iframe — same-site cookies on a shared parent domain should carry, but that is unverified here, and
the fallback is to stop embedding and link out instead. And treat authentication as the thing that
gates spend: while the gateway balance is free-tier promotional credit an open endpoint risks a few
dollars and then stops, whereas paid credit removes that ceiling.

What is **not** solved, and would matter in production:

- The rate limiter holds state per process. Across several serverless instances the effective limit
  is roughly (limit × instances). It raises the cost of abuse; it is not a hard ceiling. Durable
  counters (Redis, or a KV store from the Vercel Marketplace) are the real fix.
- Client identity for signed-out callers comes from `x-forwarded-for`, which is spoofable. That is
  why these are rate limits and not authorization.

Tunable via env: `STORY_RATE_LIMIT`, `STORY_RATE_WINDOW_MS`, `STORY_MAX_CONCURRENT`,
`STORY_MAX_CONCURRENT_GLOBAL`, `STORY_MAX_BODY_BYTES`.

## Notes

- Dictation uses the Web Speech API. The mic button is only rendered where the browser supports it.
- Your in-progress config is saved to localStorage and restored on reload.
- A stream that ends without an explicit terminator — a proxy timeout, a killed server, a dropped
  connection — is treated as a failure rather than a finished story: whatever text arrived is a
  fragment, so it is surfaced as an error and nothing is archived.
- A story the *model* cut short is the other case, and it fails soft. It arrives, and is archived,
  carrying a visible notice that it ran past the length limit — throwing away a story the reader
  waited for is the worse outcome, and the failure worth guarding against is a truncated story
  presented as complete.
