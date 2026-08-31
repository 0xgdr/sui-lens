## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Quality gate

Before describing implementation work as complete:

- Run `bun run check`. Do not ignore failing tests or a failing production build.
- Browser checks are an automated floor, not a substitute for inspecting screenshots and reading the lesson in order.
- Add a regression test for every data, decoding, or explanation bug fixed. Prefer testing the learning claim, not the current implementation shape.
- Treat chain evidence as the source of truth. Do not infer committed effects from submitted commands, flatten nested Move types, or decode bytes without sufficient type evidence.
- Keep raw evidence available, but place long values behind progressive disclosure so they do not overwhelm the explanation.
- Render every changed page at narrow mobile, tablet, and desktop widths. Check for horizontal overflow, clipped text, accidental wrapping, uneven alignment, and controls that move unrelated content between states.
- Exercise every changed interaction from its initial state through all outcomes and back through reset. For Lens changes, cover empty, invalid digest, not found, success, failure, expanded evidence, and long raw-response states.
- Only call a review “complete” when every changed file and relevant rendered state has been checked. State any untested state explicitly.

Keep the interface learner-first: plain language, JavaScript bridges where they genuinely help, and explanations close to the exact Sui evidence that supports them. Avoid marketing copy, ornamental UI that looks unfinished, and jargon introduced before it is explained.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
