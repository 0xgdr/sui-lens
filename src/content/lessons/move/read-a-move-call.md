---
track: move
order: 1
title: Resolve the full Move call
eyebrow: Package, module, function
description: Read a Move call from its complete identity before assigning meaning to its arguments.
duration: 10 min
level: Intermediate
outcome: Resolve a call using package, module, function, type arguments, and parameter signature.
takeaway: A function name alone is not enough evidence to explain a Move call.
story:
  marker: Trail note · at the checkpoint signpost
  title: Read the whole sign before deciding where the path leads.
  body: The word deposit or check_in may look familiar, but the package, module, type arguments, and signature tell you which function you are actually handing the backpack to.
  icon: checkpoint
  demo: trail-note
  accuracyNote: The signpost is a metaphor for resolving a function definition. Application meaning must come from the actual package and Move code, not from a familiar function name.
prediction:
  question: Two packages both expose a function named `deposit`. Is the function name enough to know what the call does?
  options:
    - id: 'no'
      label: No, resolve the full call
    - id: 'yes'
      label: Yes, names are globally unique
  answer: 'no'
  explanation: Resolve package, module, function, type arguments, and parameter signature before mapping positional arguments to meaning.
bridge:
  javascript: An imported function’s module path and TypeScript signature provide context for a call.
  javascriptCode: |
    import { deposit } from './vault.js';
    deposit(account, amount);
  sui: A Move call is identified by package, module, function, type arguments, and its Move parameter signature.
  suiCode: |
    package::vault::deposit<CoinType>(
      account, amount
    )
  carryOver: Resolve the definition before explaining positional arguments.
  difference: On-chain package IDs and concrete type arguments are part of the evidence.
evidence:
  - label: Package
    value: 0x… package object ID
  - label: Module
    value: trail
  - label: Function
    value: check_in
  - label: Signature
    value: '(&mut Backpack, &Checkpoint, address)'
---

## Resolve before you label

A positional argument such as `Input 3` has no application meaning by itself. First identify the package, module, and function. Then inspect type arguments and the function’s parameter signature.

Only after that can you say that `Input 3` supplies a mutable `Backpack`, a shared `Checkpoint`, or an address. This prevents confident labels based on a familiar function name or a guessed application story.

## Separate mechanics from app behavior

Move mechanics tell you how values are passed and what the function is allowed to do with them. The package’s code defines the application behavior. Keep those layers separate in the explanation.
