---
track: objects
order: 2
title: Your backpack is yours. The checkpoint belongs to everyone.
eyebrow: Ownership and access
description: Compare a personal Backpack with a shared checkpoint, then separate ownership from function permission.
duration: 10 min
level: Foundation
outcome: Explain who controls an object and whether its access needs consensus sequencing.
prerequisite: This backpack can change without becoming a different backpack.
takeaway: Ownership describes control, but it also changes how object access is sequenced.
story:
  marker: The Backpack Journey · stop 4 of 6
  title: Your backpack is yours. The checkpoint belongs to everyone.
  body: You arrive carrying one address-owned Backpack. Beside the trail is a shared CheckpointCounter that every traveller may use according to its Move rules.
  icon: checkpoint
  demo: checkpoint
  journeyStop: 4
  accuracyNote: The Backpack and CheckpointCounter are fictional teaching objects. The difference between address-owned and shared access, and the distinction between inputs and effects, maps to real Sui transaction evidence.
prediction:
  question: A shared Counter is read but not mutated. Can it still matter to the transaction’s execution path?
  options:
    - id: 'yes'
      label: Yes, it is still an input
    - id: 'no'
      label: No, only changed objects matter
  answer: 'yes'
  explanation: Changed objects show writes. A shared object can still appear as an input and require consensus-sequenced access even when the call only reads it.
bridge:
  javascript: An application can use access rules to decide who may read or update a record.
  javascriptCode: |
    const canWrite = backpack.owner === sender;
    if (canWrite) retag(backpack);
  sui: Ownership is part of the object model and the transaction’s access requirements.
  suiCode: |
    Backpack: AddressOwner(sender)
    Counter: Shared
  carryOver: Who controls state affects which operations should be allowed.
  difference: Sui records ownership on-chain, and some ownership forms change sequencing requirements.
evidence:
  - label: AddressOwner
    value: one address controls the object
  - label: ObjectOwner
    value: another object owns this child object
  - label: Shared
    value: access is consensus-sequenced
  - label: Immutable
    value: readable but cannot be changed
---

## Read the owner before the command

An object’s owner tells you more than which wallet can see it. It helps determine how the object can enter a transaction and what access path the transaction needs.

An address-owned object is controlled by one address. An object-owned object belongs to another object, which gives Sui a real parent-child relationship. A shared object can be used by multiple participants and requires consensus-sequenced access. An immutable object can be read but not changed.

Party objects expose another precise case: one address controls the object, but consensus sequences its access. Do not collapse that into ordinary address ownership or shared ownership.

## Look in inputs and effects

Inputs answer what the transaction needed. Effects answer what it wrote. Reading only the changed-object list can hide an important read-only shared input.
