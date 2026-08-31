---
track: transactions
order: 3
title: The coin pocket holds containers, not one invisible balance.
eyebrow: The transaction receipt
description: Watch gas smashing, a new travel coin, and storage accounting without mixing object lifecycle with value movement.
duration: 11 min
level: Intermediate
outcome: Explain what changed and what it cost without mixing object state with balance accounting.
prerequisite: Your route plan is a tiny program.
takeaway: Object effects answer what changed. Gas and balance effects answer what value moved and what execution cost.
story:
  marker: The Backpack Journey · stop 3 of 6
  title: Three coin objects go in. One gas coin survives. A new travel coin comes out.
  body: Open the coin pocket and keep two questions separate. Which Coin<SUI> containers still exist, and where did their SUI value go?
  icon: pass
  demo: coins
  journeyStop: 3
  accuracyNote: The coin pocket is a visual grouping. In the real transfer, the gas coins are address-owned inputs beside the fictional Backpack, not child objects stored inside it.
prediction:
  question: Two gas coin objects were deleted during gas smashing. What happened to the SUI value they held?
  options:
    - id: consolidated
      label: It was consolidated into the surviving gas coin
    - id: vanished
      label: It vanished with the deleted containers
  answer: consolidated
  explanation: Gas smashing combines the value from the payment coins into one surviving gas coin. Deleting the other coin objects does not destroy the SUI they held.
bridge:
  javascript: A function can return data while a profiler separately records resource use.
  javascriptCode: |
    const receipt = {
      result: transferResult,
      resourceCost: profiler.total,
    };
  sui: Object effects, balance effects, and gas accounting are related but distinct parts of the receipt.
  suiCode: |
    object effects: A mutated, B/C deleted, D created
    gas: computation + storage - rebate
  carryOver: Separate the result of an operation from the resources spent to perform it.
  difference: Sui storage charges and rebates participate in on-chain balance accounting.
evidence:
  - label: Computation
    value: execution charge
  - label: Storage
    value: charge for written state
  - label: Rebate
    value: credit from released or replaced storage
  - label: Net
    value: computation + storage - rebate
---

## Ask two different questions

“What changed?” points you to object and balance effects. “What did it cost?” points you to the gas summary. Keeping these questions separate prevents a friendly explanation from hiding important accounting.

Gas smashing is another object-level detail. A transaction can use several `Coin<SUI>` objects for gas, combine their value, and leave one surviving gas coin. The other gas coin objects may disappear while their value is incorporated into the survivor.

## Build the final sentence from evidence

State the execution status first. Then name created, mutated, and deleted objects. Describe balance movement with known token units. Finish with net gas accounting. This order mirrors what a learner needs to verify each claim.
