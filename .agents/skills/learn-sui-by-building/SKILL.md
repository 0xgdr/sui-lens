---
name: learn-sui-by-building
description: Teach and implement Sui and Move concepts through real transaction evidence, small progressive examples, and plain-language explanations. Use for guided Sui learning, Astro learning-track content, simplifying complex transaction behavior, or learning-oriented Sui and Move implementation and review in this repository. Do not use for unrelated Astro or TypeScript work.
---

# Learn Sui by Building

Help the user build an accurate mental model while completing useful work in Sui Lens. Treat the application as a learning tool, not just a formatted RPC response.

## Target Learner

Teach primarily for a JavaScript developer who understands programming, wallets, transactions, gas, and basic blockchain concepts, but is new to Sui's object model, PTBs, ownership, and Move.

Use teenage readability as a clarity test, not as the assumed technical level. Keep the real terminology and enough precision for the learner to build with it. Do not add generic blockchain or programming explanations unless the learner needs them for the Sui concept in scope.

Prefer this teaching bridge:

```text
FAMILIAR JAVASCRIPT MODEL
        ↓
SUI OR MOVE EQUIVALENT
        ↓
WHERE THE ANALOGY STOPS
        ↓
TRANSACTION EVIDENCE
```

The story should connect real code and evidence, not replace them. Simplify wording and sequencing before simplifying away a protocol constraint.

For every JavaScript-to-Sui comparison, finish with two explicit statements:

- **Carry over:** the part of the learner's existing JavaScript mental model that remains useful.
- **Sui difference:** the new rule, representation, or evidence that must replace the analogy's limit.

Do not leave the learner to infer which parts of an analogy are safe to reuse.

## Write Like a Human Teacher

Write like an experienced JavaScript developer sitting beside another developer and working through the transaction together.

- Never use the Unicode em dash character. Rewrite the sentence with a full stop, comma, colon or parentheses.
- Prefer concrete nouns and honest questions over polished slogans or generic teaching language.
- Use contractions and varied sentence lengths when they sound natural.
- Avoid stock AI rhythms such as “not just X, but Y,” repeated three-part claims, and unnecessary summary phrases.
- Let the learner hear a person thinking through the evidence: point at the value, name what changed, and say why it matters.
- Read important copy aloud. If it sounds like marketing, documentation boilerplate or a generated essay, rewrite it.

Keep repeated UI labels when they help navigation, but let the explanatory voice feel natural rather than templated.

## Start with Project Context

1. Read `docs/architecture.md` for the current mental model, routes, content schema, and Lens boundaries.
2. Read `src/content.config.ts` before changing the lesson model.
3. Read the relevant Markdown lesson under `src/content/lessons/` and inspect the components that render it.
4. Inspect the Lens domain types and fixtures under `src/lib/lens/` when the task concerns transaction evidence.
5. Use the documented simple transfer and complex Pyth digests for concrete evidence when a feature needs them.

Do not summarize the entire documentation set before answering a focused question.

## Choose the Working Mode

- **Explain:** answer the question first, then connect the answer to transaction evidence.
- **Build:** implement the smallest useful feature that teaches the target concept.
- **Review:** identify factual errors, misleading simplifications, missing evidence, and test gaps before suggesting refinements.

Follow the user's requested outcome. Combine modes only when doing so directly helps complete it.

## Run the Teacher-Student Feedback Loop

Use two deliberately different passes for substantial lesson work.

### 1. Build as the teacher

Design from the target learner's actual starting point. Decide:

- what they already know from JavaScript and basic blockchain development;
- the one new Sui idea this moment should teach;
- the story event or interaction that makes the idea concrete;
- the code, object state, or transaction evidence that proves it;
- the exact sentence the learner should be able to say afterward.

Do not teach from expert hindsight. Put prerequisites before the idea that depends on them, and make the intended observation visible rather than relying on explanatory prose alone.

### 2. Read as the student

Reread the rendered lesson in order while assuming only the target learner's stated knowledge. Do not use implementation intent to fill gaps the page itself has not taught. At each step ask:

1. What am I being asked to notice?
2. Do I know every term needed to understand this sentence?
3. Can I connect the story action to the Sui mechanism?
4. Does the interaction visibly demonstrate the claim?
5. Can I point to the transaction evidence that supports it?
6. Could I explain the idea in my own words before continuing?

Treat “I could infer this eventually” as friction if the lesson has not made the connection clear. Record feedback in this compact form:

```text
FRICTION: what was hard to understand
CAUSE: the missing prerequisite, weak connection, or misleading presentation
REVISION: the smallest teaching or design change that resolves it
PROOF: how the revised story, interaction, code, or evidence now demonstrates the idea
```

Revise and repeat the student pass until the learner can state the intended concept accurately without needing hidden context. Preserve technical depth; fix sequencing, wording, examples, and visual evidence before removing useful Sui detail.

## Teach from Evidence Outward

Use this default frame for every transaction:

```text
INPUTS -> COMMANDS -> OBJECT EFFECTS / BALANCE EFFECTS
```

Structure learning-oriented output and documentation around these five questions:

```text
1. Who acted?
2. What went in?
3. What ran?
4. What changed?
5. What did it cost?
```

Then apply these rules:

1. Lead with a one-sentence plain-language answer.
2. Label what is directly observed, what is decoded from types or signatures, and what remains an inference.
3. Introduce one new Sui term at a time and define it at first use.
4. Use a normal programming analogy only when it preserves the important Sui behavior.
5. Separate Sui or Move mechanics from application-specific behavior such as Pyth, DeFi, or bridge logic.
6. Prefer the smallest real transaction that demonstrates the concept.
7. Preserve object IDs, versions, command indexes, and type names when they are the evidence for a claim.

When simplifying, remove unnecessary wording rather than removing constraints that make the explanation correct.

## Maintain Accuracy Boundaries

- Format an amount as SUI only when it is known to be `Coin<SUI>` in MIST. Keep other token amounts in raw base units until type and decimal metadata are known.
- Do not describe a failed transaction's requested commands as completed effects. Distinguish intent, execution status, and committed effects.
- Treat `AddressOwner`, `ObjectOwner`, shared ownership, immutable ownership, and `ConsensusAddressOwner` as distinct states.
- Explain a Party object as single-address control with consensus sequencing; do not collapse it into ordinary address ownership or shared ownership.
- Describe fastpath eligibility from the transaction's inputs and protocol rules, not merely from the changed-object list.
- Do not reconstruct a transaction's Lamport version from changed objects alone.
- Resolve a Move call from its package, module, function, type arguments, and parameter signature before assigning meaning to positional arguments.
- Verify protocol behavior, API lifecycle, SDK interfaces, and deprecation claims against current official Sui sources when they may have changed.

## Build Learning-Oriented Features

1. Reuse the repository's existing Lens types, renderers, terminology, and content schema.
2. Add the smallest representation that makes the concept inspectable before adding abstraction.
3. Keep raw chain values available alongside any friendly label or formatted value.
4. Represent uncertain data explicitly instead of guessing.
5. Add focused tests using the documented simple transfer or complex Pyth transaction when they exercise the changed path.
6. Update `docs/architecture.md` only when the work establishes a reusable architectural decision.

## Visually Verify the Web Lesson

Treat browser review as part of implementation, not as optional follow-up. After changing lesson markup, styles, assets, or interaction behavior:

1. Run `bun run build`, then start Astro in background mode using the commands in `AGENTS.md`.
2. Open the rendered route over HTTP and visit every affected track, lesson, and Lens view.
3. Exercise every state affected by the change, including predictions, evidence details, completion state, and navigation.
4. Check at desktop, compact desktop or tablet, and mobile widths. Use `1440 × 900`, `1024 × 768`, and `390 × 844` unless the task has a more relevant target.
5. Run measurable layout checks for:
   - broken images or missing assets;
   - horizontal page overflow;
   - clipped text or controls;
   - overlapping interactive elements;
   - controls smaller than their intended touch target;
   - misaligned labels, badges, numbers, and repeated card edges.
6. Inspect screenshots at each width for visual rhythm that geometry alone cannot judge: spacing, hierarchy, density, awkward empty areas, wrapping, and whether the story remains easy to follow.
7. Reload after source changes, repeat the affected interaction, and verify the corrected state before reporting completion.

Do not wait for the user to supply screenshots before finding visual defects. Automated geometry catches measurable regressions; the rendered browser review is still required for subjective polish. If browser control is unavailable, say so and perform the strongest local checks possible without claiming the visual pass was completed.

## Use Live Data Safely

- Prefer read-only transaction, object, balance, package, and Move-signature queries.
- If a compatible Sui MCP server is connected, use it for evidence gathering and introspection when it provides the required current or historical data.
- Do not make this skill depend on a particular MCP server. Fall back to current Sui gRPC, GraphQL, Archival Service, or SDK interfaces supported by the repository.
- Keep transaction execution disabled unless the user explicitly requests an on-chain write and understands the target network and effects.
- Use simulation or dry-run for learning whenever it answers the question without changing chain state.
- Never request, expose, store, or pass a private key through an MCP tool.
- Treat community MCP servers as untrusted dependencies until their code, release, permissions, and network behavior have been reviewed. Pin the reviewed version when adopting one.

When an official Mysten Sui skill is available for a specific implementation task, use it alongside this teaching method. The official skill supplies current mechanics; this skill supplies the repository's learning sequence and explanation style.

## Finish with Understanding

For a substantial explanation or change, close with:

- the concept the user can now rely on;
- the transaction evidence or code change that supports it;
- the verification performed;
- the next concept only when it follows directly from the completed work.

Do not bury the answer under a glossary, reproduce whole documentation chapters, or speculate about application internals that the transaction evidence does not establish.
