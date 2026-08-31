---
track: objects
order: 1
title: This backpack can change without becoming a different backpack.
eyebrow: Object identity
description: Change one field, then inspect why the object ID stays while version and digest evidence move forward.
duration: 8 min
level: Foundation
outcome: Read an object reference as one exact revision of persistent state.
takeaway: The object ID says which object. Version and digest say which revision.
story:
  marker: The Backpack Journey · stop 1 of 6
  title: You replace “Day pack” with “Trail ready” on the backpack’s tag.
  body: You already know what it means to change a property on a JavaScript object. The backpack gives us something concrete to follow while Sui adds persistent identity and revision evidence.
  icon: backpack
  demo: object
  journeyStop: 1
  accuracyNote: Backpack 0xb4c0 is a fictional teaching object. Its ID is intentionally short so you can see which values stay stable and which values change. The object rules shown here are real.
prediction:
  question: A transaction updates the label on object 0xb4c0. Which value should still identify the object afterward?
  options:
    - id: digest
      label: The digest
    - id: object-id
      label: The object ID
    - id: version
      label: The version
  answer: object-id
  explanation: A mutation writes a newer revision of the same object. Its ID stays stable while version and digest evidence change.
bridge:
  javascript: An object reference can keep pointing to the same object while a property changes.
  javascriptCode: |
    const backpack = { trailTag: 'Day pack' };
    backpack.trailTag = 'Trail ready';
  sui: A Sui object has persistent on-chain identity plus a version and digest for a specific revision.
  suiCode: |
    0xb4c0 @ version 10
    → 0xb4c0 @ version 27
  carryOver: One object can keep its identity while its fields change.
  difference: Sui records each written revision with chain-assigned version and digest evidence.
evidence:
  - label: Object ID
    value: '0xb4c0'
    note: Stable identity in this fictional lesson example
  - label: Before
    value: version 10 · digest 7Qm…k2
  - label: After
    value: version 27 · digest 9Fd…p8
---

## Start with the reference

When a Sui transaction uses an object, it does not mean “whatever object `0xb4c0` looks like now.” It refers to a particular revision. That revision is described by an object ID, a version, and a digest.

The **object ID** is durable identity. The **version** is a logical version assigned by Sui. The **digest** fingerprints the contents of that exact revision.

## Mutation is not replacement

If a Move function changes the object, the effects can show the same ID at a newer version. Do not read the version as a simple edit counter. It does not have to increase by one.

Creation is different. A created object has a new ID. Deletion is different too: there is no live object revision after the delete.

## Say it back

“This is still object `0xb4c0`, but the transaction wrote a newer revision of it.”
