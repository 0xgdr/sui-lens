---
track: transactions
order: 1
title: Your route plan is a tiny program.
eyebrow: Inputs and commands
description: Pack the inputs, follow two ordered commands, and trace the travel coin passed between them.
duration: 9 min
level: Foundation
outcome: Identify PTB inputs, ordered commands, and the values that connect them.
takeaway: Read a PTB as inputs flowing through ordered commands into effects.
story:
  marker: The Backpack Journey · stop 2 of 6
  title: First make a 1 SUI travel coin. Then hand that exact coin to the guide.
  body: At the trailhead, the route needs three starting values. Pack a gas coin, the amount to split, and the guide’s address, then follow the value produced by the first command.
  icon: map
  demo: ptb
  journeyStop: 2
  accuracyNote: This stop uses the project’s real simple-transfer PTB. The Backpack and trail guide provide the human story, while the amount, command order, and NestedResult reference come from transaction evidence.
prediction:
  question: In `SplitCoins(GasCoin, Input 0)`, what does `Input 0` mean?
  options:
    - id: value
      label: Use the value stored in inputs[0]
    - id: object
      label: Use object version 0
    - id: command
      label: Run command number 0
  answer: value
  explanation: '`Input 0` is a numbered pointer to the first ordinary PTB input. In this transaction, that value is the 1 SUI amount.'
bridge:
  javascript: JavaScript lets you give each value a useful name. Here they are amount, guide, and travelCoin.
  javascriptCode: |
    const travelCoin = splitCoin(gasCoin, amount);
    transferObjects([travelCoin], guide);
  sui: A saved PTB cannot rely on your local variable names. It points to where each value came from instead.
  suiCode: |
    Input 0             = amount
    Input 1             = guide
    NestedResult [0, 0] = travelCoin

    0: SplitCoins(GasCoin, [Input 0])
    1: TransferObjects([NestedResult [0, 0]], Input 1)
  aliases:
    - javascript: amount
      sui: Input 0
      meaning: The value in inputs[0]
    - javascript: guide
      sui: Input 1
      meaning: The value in inputs[1]
    - javascript: travelCoin
      sui: NestedResult [0, 0]
      meaning: First result from SplitCoins, the new 1 SUI coin
  carryOver: The same values flow between the same two calls.
  difference: JavaScript uses names. A serialized PTB uses numbered locations such as inputs[0] and commands[0].results[0].
evidence:
  - label: Input 0
    value: 1_000_000_000 MIST
    note: Known Coin<SUI> amount, equal to 1 SUI
  - label: Command 0
    value: SplitCoins(GasCoin, Input 0)
  - label: Command 1
    value: TransferObjects(NestedResult [0, 0], Input 1)
---

## Find the nouns, then the verbs

Start with the transaction inputs. They are the values and objects available to the transaction. Then read commands in order. A command can consume an input directly or use a result produced by an earlier command.

For a simple payment, `SplitCoins` creates a new coin value from the gas coin. `TransferObjects` then transfers that exact result to the recipient.

## Read the numbers as coordinates

`Input 0` is the PTB version of `inputs[0]`. It points to the first supplied input, which we called `amount` in JavaScript.

`NestedResult [0, 0]` is the PTB version of `commands[0].results[0]`. The first zero means command 0. The second zero means output 0 from that command. We called that output `travelCoin` in JavaScript.

Why does a command need its own result number? `SplitCoins` accepts a list of amounts and can create more than one coin. If it creates three coins, they are results 0, 1, and 2. This transaction asks for one amount, so result 0 is the one new 1 SUI coin.

Read `[0, 0]` as two lookups: open command 0 (`SplitCoins`), then take its result 0 (`travelCoin`).

It is the same value, not a copy. JavaScript points to it with a name. The saved transaction points to it with coordinates.
