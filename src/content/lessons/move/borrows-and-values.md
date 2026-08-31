---
track: move
order: 2
title: The gear tag tells the function what it may do.
eyebrow: Move handling rules
description: Try three handling instructions and see when the Backpack is borrowed, may be changed, or moves into the function.
duration: 9 min
level: Intermediate
outcome: Explain what a parameter permits without claiming more than the signature proves.
prerequisite: Your backpack is yours. The checkpoint belongs to everyone.
takeaway: A signature describes permission and handling. Effects prove what actually changed.
story:
  marker: The Backpack Journey · stop 5 of 6
  title: Read the handling instruction before handing over the backpack.
  body: The PTB argument tells you which value went in. The Move signature tells you whether the function borrows it for reading, may mutate it, or takes the value itself.
  icon: tag
  demo: signature
  journeyStop: 5
  accuracyNote: The gear tag makes the parameter rule visible. The resolved Move signature is the real evidence, and object effects still prove whether a permitted mutation actually committed.
prediction:
  question: 'A function accepts `&mut Backpack`. Does the signature alone prove that the Backpack changed?'
  options:
    - id: 'no'
      label: No, it only permits mutation
    - id: 'yes'
      label: Yes, mutation is guaranteed
  answer: 'no'
  explanation: '`&mut` allows the function to mutate through that borrow. Check transaction effects to prove whether a write actually committed.'
bridge:
  javascript: TypeScript can describe a read-only parameter, and code may mutate an ordinary object reference.
  javascriptCode: |
    function retag(backpack: Backpack) {
      backpack.trailTag = 'Trail ready';
    }
  sui: Move makes read-only borrow, mutable borrow, and by-value handling explicit in the function signature.
  suiCode: |
    fun retag(backpack: &mut Backpack)
    fun inspect(backpack: &Backpack)
  carryOver: A parameter’s type is a clue to how the function uses the value.
  difference: Move enforces these handling rules, but the effects still provide evidence of an actual committed mutation.
evidence:
  - label: '&T'
    value: read-only borrow
  - label: '&mut T'
    value: mutable borrow
  - label: T
    value: value is passed by value
---

## Permission is not proof

`&T` gives the function a read-only borrow. `&mut T` gives it a mutable borrow. Passing `T` by value moves the value into the function, where the function must handle it according to Move’s rules and the type’s abilities.

The signature tells you what is permitted. It does not prove which branch ran or which object was written. Pair the signature with execution status and object effects before saying that a mutation occurred.

## Read generic types concretely

`T` is a placeholder, not short for “transaction.” Type arguments and the resolved signature tell you which concrete type fills that placeholder for this call.
