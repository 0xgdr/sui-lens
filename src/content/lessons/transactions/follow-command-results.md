---
track: transactions
order: 2
title: Follow values between commands
eyebrow: Result references
description: Decode Result and NestedResult references without losing track of the value they name.
duration: 8 min
level: Intermediate
outcome: Trace one command output into every later command that consumes it.
prerequisite: Your route plan is a tiny program.
takeaway: A result reference is an edge in the transaction’s data-flow graph.
story:
  marker: Trail note · inside the route plan
  title: Follow the travel coin instead of reading the boxes in isolation.
  body: The guide receives a coin that did not exist in the original inputs. Give that intermediate value a JavaScript-style name, then match it to the PTB’s command and output indexes.
  icon: compass
  demo: trail-note
  accuracyNote: A JavaScript variable name is a teaching aid. The serialized PTB records Result or NestedResult indexes rather than the name travelCoin.
prediction:
  question: One SplitCoins command requests three amounts. How many result coins can it produce?
  options:
    - id: one
      label: Exactly one
    - id: three
      label: Three result coins
    - id: unknown
      label: Results cannot be referenced
  answer: three
  explanation: SplitCoins can produce one coin for each requested amount. NestedResult identifies a particular output from that command.
bridge:
  javascript: Array destructuring can name several values returned by one operation.
  javascriptCode: |
    const [firstCoin, secondCoin] = splitCoins(
      gasCoin, [firstAmount, secondAmount]
    );
  sui: A PTB command may expose multiple results that later commands reference by command and result index.
  suiCode: |
    firstCoin  → NestedResult [0, 0]
    secondCoin → NestedResult [0, 1]
  carryOver: Keep track of which returned value flows into which later call.
  difference: Result and NestedResult make those indexes explicit in serialized transaction data.
evidence:
  - label: Result 0.0
    value: first coin created by command 0
  - label: Result 0.1
    value: second coin created by command 0
  - label: Consumer
    value: later command references the exact result index
---

## One command can have several outputs

Do not assume one command means one result. `SplitCoins` accepts a list of amounts and can create a result coin for each one.

The safest reading habit is to label each produced value by its command index and output index. Then follow that label forward. A transfer may consume one output while another output is passed into a Move call.

## Keep token units honest

Only format a known `Coin<SUI>` amount from MIST into SUI. A `Coin<T>` with unresolved type or decimal metadata should stay in raw base units. Friendly labels are useful only when the underlying type evidence supports them.
