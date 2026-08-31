---
track: objects
order: 3
title: Follow an object’s lifecycle
eyebrow: Created, mutated, deleted
description: Use transaction effects to distinguish new objects, new revisions, and objects that no longer exist.
duration: 9 min
level: Foundation
outcome: Classify each object effect without confusing creation, mutation, wrapping, and deletion.
prerequisite: Your backpack is yours. The checkpoint belongs to everyone.
takeaway: Effects describe what committed, not merely what a command intended to do.
story:
  marker: Trail note · after retagging the backpack
  title: Put the old tag and the new receipt side by side.
  body: The tag change was requested by a command. Now inspect the receipt and decide whether the chain created an object, wrote a newer revision, or left no live object behind.
  icon: receipt
  demo: trail-note
  accuracyNote: A command describes the requested program. Only execution status and committed effects support a claim about what actually happened on chain.
prediction:
  question: A transaction requests a transfer but fails. Should the requested recipient be described as the new owner?
  options:
    - id: 'yes'
      label: Yes, the command proves it
    - id: 'no'
      label: No, check status and effects
  answer: 'no'
  explanation: The command records intent. A failed transaction must not be described as if its requested state changes committed.
bridge:
  javascript: Code can construct, update, and discard values during execution.
  javascriptCode: |
    records.set(id, nextRevision);
    records.delete(expiredId);
  sui: Successful transaction effects record which persistent objects were created, mutated, or deleted.
  suiCode: |
    status: success
    effects: created | mutated | deleted
  carryOver: Different operations produce different state transitions.
  difference: On-chain claims must follow committed effects and execution status, not source-level intent alone.
evidence:
  - label: Created
    value: a new object ID becomes live
  - label: Mutated
    value: the same object ID gets a newer revision
  - label: Deleted
    value: no live object remains after the transaction
---

## Effects are the receipt

Commands tell you what the transaction attempted. Effects tell you what the chain committed. Always read the execution status before turning a command into a past-tense claim.

For a successful transaction, a created effect introduces a new identity. A mutated effect advances an existing identity. A deleted effect means the object no longer has a live revision.

Wrapped and unwrapped objects deserve their own labels when the data exposes them. They describe object relationships, not ordinary deletion and recreation.

## Keep the evidence precise

When explaining a mutation, preserve the ID and show the newer version. When explaining creation, point out the new ID. That small distinction is the foundation for reading larger transactions correctly.
