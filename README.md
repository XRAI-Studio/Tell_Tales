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

Vercel's **free tier rate-limits most models per short window**, independently of your credit
balance — a $5 promotional balance does not lift the limits, only purchased credits do. As of
writing, `openai/gpt-oss-120b` and `alibaba/qwen-3-32b` are usable on the free tier; the stronger
storytellers, `anthropic/claude-sonnet-5` among them, return 429 or "no access" until you top up.

Two consequences worth knowing:

- If you hit a 429, it clears on its own in a couple of minutes. The app shows the gateway's own
  message rather than hiding it.
- Free-tier models often can't hold to a JSON schema, so the fact-check pass may not run. The app
  fails soft here: you get the draft with a visible notice that it is unverified, rather than losing
  the story. Set `STORY_MODEL=anthropic/claude-sonnet-5` (with credits) for the full fact pass.

```bash
npm test          # 52 unit tests over the pure logic
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

## Notes

- Dictation uses the Web Speech API. The mic button is only rendered where the browser supports it.
- Your in-progress config is saved to localStorage and restored on reload.
