---
track: move
order: 3
title: Unfold the receipt and reconstruct the trail payment.
eyebrow: The five questions
description: Empty the journey onto the table and rebuild one real SUI transfer from five pieces of evidence.
duration: 12 min
level: Intermediate
outcome: Produce a plain-language transaction summary with every claim tied to visible evidence.
prerequisite: The gear tag tells the function what it may do.
takeaway: Explain from observed evidence outward, and label decoded meaning and inference honestly.
story:
  marker: The Backpack Journey · stop 6 of 6
  title: Empty the backpack onto the table and rebuild the trail payment.
  body: Do not retell the journey from memory. Open the real 1 SUI transfer receipt and classify the sender, inputs, commands, committed effects, and cost one piece at a time.
  icon: receipt
  demo: receipt
  journeyStop: 6
  accuracyNote: The six story stops are not one large on-chain transaction. This final receipt reconstructs one real mainnet transaction, the 1 SUI payment to the guide.
prediction:
  question: Where should you look to prove that the recipient owns a newly split coin after a successful payment?
  options:
    - id: effects
      label: Object ownership effects
    - id: command
      label: The requested command only
    - id: sender
      label: The sender address
  answer: effects
  explanation: The command shows the requested transfer. Successful effects provide the committed ownership evidence.
bridge:
  javascript: You can debug a program by tracing inputs, calls, returned values, and state changes.
  javascriptCode: |
    const explanation = trace({
      inputs, calls, results, stateChanges,
    });
  sui: Transaction data exposes sender, PTB inputs and commands, committed effects, and gas or balance accounting.
  suiCode: |
    INPUTS → COMMANDS → EFFECTS
    observed | decoded | inferred
  carryOver: Reconstruct behavior by following data through execution.
  difference: Each on-chain claim should be marked as observed, decoded from types, or inferred from the evidence.
evidence:
  - label: 1 · Who acted?
    value: sender and gas owner
  - label: 2 · What went in?
    value: pure values and object inputs
  - label: 3 · What ran?
    value: ordered PTB commands
  - label: 4 · What changed?
    value: status, object effects, balance effects
  - label: 5 · What did it cost?
    value: computation, storage, rebate, net gas
---

## Use the same order every time

The five questions are a reading tool, not a replacement for raw data. They give the learner a stable path through transactions of very different sizes.

Start with the sender. Inventory every input, including read-only shared objects. Trace commands and their result references. Check status before describing effects. Then separate object changes, balance movement, and gas cost.

## Label the strength of each claim

**Observed** means the transaction response states it directly. **Decoded** means a type or resolved signature gives the raw value a precise meaning. **Inferred** means several facts support a conclusion that the response does not state as one field.

Good explanations keep all three useful while making their boundaries visible.
