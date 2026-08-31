# Sui Lens production foundation

This repository is the production successor to the completed Sui Lens POC. It keeps the POC as evidence of what worked, while giving the product a new Astro architecture and independent implementation.

The application has two connected jobs:

1. teach a JavaScript developer how to think in Sui objects, transactions, and Move calls;
2. let that learner apply the model to real transaction evidence in the Lens.

The learning experience and transaction explorer share terminology and evidence types. They do not share page-specific state or tightly coupled rendering code.

## Learning principles preserved from the POC

- Teach from real transaction evidence outward.
- Use `INPUTS -> COMMANDS -> OBJECT EFFECTS / BALANCE EFFECTS` as the durable transaction model.
- Ask five questions: who acted, what went in, what ran, what changed, and what did it cost.
- Start from a familiar JavaScript model, name the Sui equivalent, state where the analogy stops, then point to the evidence.
- End each analogy with explicit **Carry over** and **Sui difference** statements.
- Ask for a prediction before revealing an explanation.
- Keep raw values reachable beside every friendly label.
- Distinguish observed facts, decoded meaning, and inference.
- Keep the writing direct, concrete, and technically honest.

## The narrative spine

The Backpack Journey is the primary learning route, not a decorative theme placed on top of the curriculum. It gives the learner one object and one human situation to carry across six stops:

```text
meet the Backpack
      ↓
pay the trail guide with a two-command PTB
      ↓
open the coin pocket and inspect gas smashing
      ↓
compare the personal Backpack with a shared checkpoint
      ↓
read &, &mut, and by-value as handling instructions
      ↓
reconstruct the real payment from its receipt
```

The six stops cross the three concept tracks. The tracks remain useful as reference paths and contain three deeper trail-note lessons, but they must not replace or fragment the main story.

The six-stop route is self-contained. A journey lesson may build on an earlier journey stop, but it must not require one of the optional trail-note lessons. Journey pages show journey numbering and use a single complete-and-continue action so saved progress and navigation cannot drift apart.

Every journey lesson follows this order:

1. set up a concrete moment in the story;
2. ask the learner to predict before seeing the answer;
3. let the learner manipulate a visual experiment;
4. explain the Sui term and show where the JavaScript analogy stops;
5. point to exact transaction, object, type, or effect evidence;
6. leave one sentence worth remembering.

The Backpack, map, compass, pass, checkpoint, tag, and receipt icons are part of that teaching language. They were deliberately carried forward from the POC and live in `public/journey/`. They should appear where they reinforce a story object or action, not as generic decoration.

## Learning tracks

| Track | Purpose | Outcome |
| --- | --- | --- |
| Think in objects | Identity, versions, ownership, lifecycle | Read an object reference and explain who can use it next |
| Read the transaction | PTB inputs, result flow, effects, and cost | Reconstruct a transaction from inputs to final effects |
| Decode Move calls | Full call identity, signatures, and evidence synthesis | Turn a raw Move call into a precise explanation |

Each track contains three lessons. Track metadata lives in `src/data/tracks.ts`. Lesson content lives in `src/content/lessons/` and is validated by `src/content.config.ts`.

## Route map

| Route | Role |
| --- | --- |
| `/` | Backpack Journey, saved progress, concept references, and recurring Lens entry |
| `/learn` | Redirect to the Backpack Journey at `/` |
| `/learn/[track]` | Ordered lessons and track outcome |
| `/learn/[track]/[lesson]` | Prediction, Markdown lesson, JavaScript bridge, evidence, and completion state |
| `/lens` | Transaction digest entry and five-question evidence view |
| `/method` | Public explanation of the teaching method |

Astro generates track and lesson routes statically from authoritative track metadata and the lesson content collection.

## Shared design system

The CSS custom properties in `src/styles/global.css` are the system source of truth.

- Deep navy represents the inspection surface and raw transaction context.
- Blue marks the active path, observed structure, and primary actions.
- Amber marks prediction and deliberate pause.
- Coral is reserved for contrast, cautions, and future inferred evidence.
- White cards and restrained grid lines keep dense technical material readable.
- The circular Lens motif and crosshair lines suggest inspection without decorative imagery.
- Structural cards, forms, and workbenches use consistent radii, borders, padding, and soft elevation. Their geometry should never look clipped or improvised.
- Story icons may sit on simple circular colour plates. Playfulness comes from the illustration, colour, and teaching voice rather than irregular component edges or decorative tape on functional controls.
- The self-hosted Atkinson Hyperlegible family keeps explanations conversational and consistent across operating systems. Its matching mono face is reserved for indexes, identifiers, raw values, and evidence labels.
- Shared text-size tokens keep meaningful learner copy at 12px or larger. Explanations and controls use the larger supporting sizes; the smallest size is reserved for compact metadata.

Reusable UI lives in `src/components/`. Page structure belongs in `src/layouts/` and `src/pages/`. Components receive authoritative records rather than fetching or inventing their own data.

## Markdown lesson model

Every lesson has a validated frontmatter record plus Markdown body content.

Required metadata covers:

- track, order, title, description, duration, level, and outcome;
- one prediction with choices, answer, and explanation;
- one JavaScript-to-Sui bridge with carry-over and difference boundaries;
- one short JavaScript sketch beside the corresponding Sui representation or evidence;
- an optional name-to-reference map when serialized indexes replace familiar variable names;
- one or more evidence items with optional raw notes;
- one durable takeaway sentence.

The Markdown body is reserved for concept explanation. Structured teaching interactions stay in frontmatter so shared components render them consistently and future authoring tools can edit them safely.

## Learning-focused Lens architecture

The Lens is a pipeline with four boundaries:

```text
READ-ONLY SOURCE
      ↓
RAW TRANSACTION RESPONSE
      ↓ normalize
STABLE DOMAIN EVIDENCE
      ↓ explain
FIVE QUESTION REPORT
      ↓ render
LEARNING VIEW + RAW EVIDENCE
```

The domain contracts live in `src/lib/lens/types.ts`.

- `src/lib/lens/source.ts` owns chain acquisition and uses the supported `SuiGraphQLClient` against Sui's mainnet index. GraphQL is deliberate here: unlike a pruned full-node read, it can still retrieve the historical worked transactions used by the learning journey. The same client resolves Move function signatures for call argument decoding; a missing signature leaves the transaction readable instead of guessing.
- `src/lib/lens/normalize.ts` preserves raw identifiers, indexes, nested Move types, amounts, status, effects, ownership, and gas fields in stable project types. It only decodes a pure value when the command position or a resolved Move signature supplies a reliable type context. BCS sequence lengths must use their canonical encoding, and ASCII and UTF-8 strings keep their distinct validity rules. Shared, receiving, immutable, and object-owned inputs are labeled from the CallArg kind and, for ImmOrOwned objects, from observed input owners.
- `TransactionExplainer` turns normalized evidence into a `LensReport`.
- Each answer carries an evidence level and a lesson link.
- `src/lib/lens/explain.ts` enforces learning boundaries such as separating sender from gas owner, distinguishing submitted commands from committed effects after failure, and only naming `Coin<SUI>` when the returned type proves it. A Move signature can show that one command had `&mut` permission. Transaction object effects can show that the object changed, but they do not identify which command performed that write.
- `LensWorkspace.astro` presents loading, validation, not-found, network-error, report, and raw-response states. Digest validation uses the Sui SDK, and malformed device-local history is ignored. Presentation never invents missing values. Long evidence values use progressive disclosure, while the complete raw response remains valid, copyable JSON with primitive arrays grouped onto readable lines instead of expanding every byte vertically.

The sample transfer digest remains an intentional teaching entry point based on the POC's documented mainnet transfer. It now travels through the same live acquisition, normalization, explanation, and presentation pipeline as any learner-supplied mainnet digest. The Pyth worked transaction is also exercised as a complex live verification case.

## Local learner state

Lesson completion is device-local and stored in `localStorage` under `sui-lens:completed-lessons`. The five most recently inspected transaction digests and their plain-language summaries are stored under `sui-lens:recent-inspections` so a returning learner can reopen work without an account. Stored values are treated as untrusted input; malformed shapes are ignored instead of breaking the journey or Lens. Curriculum content and transaction evidence remain build-owned data. Persistent accounts, remote progress, and on-chain writes are outside this foundation.

## Next implementation boundary

Decode additional BCS shapes (vectors of primitives other than `u8`) only when the signature type makes that safe.
