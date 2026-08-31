import type {
  EvidenceItem,
  LensAnswer,
  LensReport,
  NormalizedBalanceChange,
  NormalizedObjectChange,
  NormalizedTransaction,
} from './types';

const SUI_TYPE = '0x2::sui::SUI';

function short(value: string, head = 8, tail = 6): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

function compactType(type: string): string {
  return type.replace(/0x0{1,63}/g, '0x');
}

function isSuiType(type: string): boolean {
  return compactType(type) === SUI_TYPE;
}

function isSuiCoin(type?: string): boolean {
  return Boolean(type && compactType(type) === `0x2::coin::Coin<${SUI_TYPE}>`);
}

function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

function ownerLabel(change: NormalizedObjectChange): string {
  const owner = change.outputOwner ?? change.inputOwner;
  if (!owner) return 'no surviving owner';
  if (owner.kind === 'AddressOwner') return `address-owned by ${short(owner.value)}`;
  if (owner.kind === 'ObjectOwner') return `owned by object ${short(owner.value)}`;
  if (owner.kind === 'Shared') return `shared from ${owner.value}`;
  if (owner.kind === 'Immutable') return 'immutable';
  return `${owner.kind}: ${short(owner.value)}`;
}

function objectIdFromInputSummary(summary: string): string | null {
  const match = summary.match(/\bobject (0x[0-9a-fA-F]+)\b/i);
  return match ? match[1] : null;
}

function writtenObjectIds(changes: NormalizedObjectChange[]): Set<string> {
  const ids = new Set<string>();
  for (const change of changes) {
    if (change.lifecycle === 'mutated' || change.lifecycle === 'deleted') {
      ids.add(change.objectId.toLowerCase());
    }
  }
  return ids;
}

function mutPermissionNotes(
  command: { index: number; summary: string },
  inputs: NormalizedTransaction['inputs'],
  changes: NormalizedObjectChange[],
  status: NormalizedTransaction['status'],
): EvidenceItem[] {
  const notes: EvidenceItem[] = [];
  const written = writtenObjectIds(changes);
  for (const match of command.summary.matchAll(/Input (\d+) as &mut\b/g)) {
    const index = Number(match[1]);
    const input = inputs[index];
    const objectId = input ? objectIdFromInputSummary(input.summary) : null;
    const label = `Command ${command.index} · Input ${index} &mut`;

    if (status === 'failure') {
      notes.push({
        label,
        value: 'Permission for this command. The transaction did not commit application writes.',
        raw: objectId ?? input?.raw ?? '',
      });
      continue;
    }

    if (!objectId) {
      notes.push({
        label,
        value: 'Permission for this command. Object effects are the source of truth for writes; this argument is not tied to a known object id.',
        raw: input?.raw ?? '',
      });
      continue;
    }

    const didWrite = written.has(objectId.toLowerCase());
    notes.push({
      label,
      value: didWrite
        ? `Mutable permission for this command. Object effects show that ${short(objectId)} changed somewhere in the transaction, but they do not identify which command changed it.`
        : `Mutable permission for this command. Object effects show no committed change to ${short(objectId)}.`,
      raw: objectId,
    });
  }
  return notes;
}

function formatSui(mist: string): string {
  const negative = mist.startsWith('-');
  const absolute = BigInt(negative ? mist.slice(1) : mist);
  const whole = absolute / 1_000_000_000n;
  const fraction = (absolute % 1_000_000_000n).toString().padStart(9, '0').replace(/0+$/, '');
  return `${negative ? '−' : ''}${whole.toLocaleString()}${fraction ? `.${fraction}` : ''} SUI`;
}

function formatMist(mist: string): string {
  const value = BigInt(mist);
  const absolute = value < 0n ? -value : value;
  return `${value < 0n ? '−' : ''}${absolute.toLocaleString()} MIST`;
}

function formatSuiAndMist(mist: string): string {
  return `${formatSui(mist)} (${formatMist(mist)})`;
}

function balanceLabel(change: NormalizedBalanceChange): string {
  const amount = isSuiType(change.coinType) ? formatSui(change.amount) : `${change.amount} base units`;
  return `${amount} · ${short(change.address)}`;
}

function effectEvidence(changes: NormalizedObjectChange[]): EvidenceItem[] {
  const visible: EvidenceItem[] = changes.slice(0, 12).map((change) => ({
    label: change.lifecycle,
    value: `${isSuiCoin(change.objectType) ? 'Coin<SUI> ' : ''}${short(change.objectId)} · ${ownerLabel(change)}`,
    raw: [
      change.objectType,
      change.inputVersion ? `input version ${change.inputVersion}` : null,
      change.outputVersion ? `output version ${change.outputVersion}` : null,
      change.objectId,
    ].filter(Boolean).join('\n'),
  }));
  if (changes.length > visible.length) {
    visible.push({
      label: 'More objects',
      value: `${changes.length - visible.length} additional changes are preserved in the raw response`,
      raw: '',
    });
  }
  return visible;
}

function summarize(transaction: NormalizedTransaction): string {
  if (transaction.status === 'failure') {
    return `This transaction failed onchain. Its ${plural(transaction.commands.length, 'programmable command')} did not commit the intended state changes.`;
  }

  const splitCommands = new Set(
    transaction.commands.filter((command) => command.kind === 'SplitCoins').map((command) => command.index),
  );
  for (const command of transaction.commands) {
    if (command.kind !== 'TransferObjects') continue;
    const connection = command.summary.match(/^Transfer NestedResult \[(\d+), \d+\] to Input (\d+)$/);
    if (!connection || !splitCommands.has(Number(connection[1]))) continue;
    const recipient = transaction.inputs[Number(connection[2])]?.summary.match(/^Pure address (0x[0-9a-f]+) \(recipient address\)$/i)?.[1];
    if (!recipient) continue;
    const positiveSui = transaction.balanceChanges.find(
      (change) => isSuiType(change.coinType)
        && change.address.toLowerCase() === recipient.toLowerCase()
        && BigInt(change.amount) > 0n,
    );
    if (positiveSui) {
      return `A newly split SUI coin reached ${short(recipient)}; that address's net balance rose by ${formatSui(positiveSui.amount)}.`;
    }
  }

  return `This transaction ran ${plural(transaction.commands.length, 'programmable command')}, changed ${plural(transaction.objectChanges.length, 'object')}, and recorded ${plural(transaction.balanceChanges.length, 'balance change')}.`;
}

export function explainTransaction(transaction: NormalizedTransaction): LensReport {
  const samePayer = Boolean(
    transaction.sender
    && transaction.gasOwner
    && transaction.sender.toLowerCase() === transaction.gasOwner.toLowerCase(),
  );
  const actorEvidence: EvidenceItem[] = [];
  if (transaction.sender) actorEvidence.push({ label: 'Sender', value: short(transaction.sender), raw: transaction.sender });
  if (transaction.gasOwner) actorEvidence.push({ label: 'Gas owner', value: short(transaction.gasOwner), raw: transaction.gasOwner });

  const inputEvidence: EvidenceItem[] = transaction.inputs.slice(0, 12).map((input) => ({
    label: `Input ${input.index}`,
    value: input.summary,
    raw: input.raw,
  }));
  if (transaction.gasPayments.length) {
    inputEvidence.unshift({
      label: 'Gas payment',
      value: plural(transaction.gasPayments.length, 'object'),
      raw: transaction.gasPayments.map((payment) =>
        `${payment.objectId} @ version ${payment.version} · ${payment.digest}`).join('\n'),
    });
  }

  const commandEvidence: EvidenceItem[] = [];
  if (transaction.status === 'failure') {
    commandEvidence.push({
      label: 'Failure',
      value: transaction.error ?? 'The chain reported a failure without a reason.',
    });
  }
  let sawMutPermission = false;
  for (const command of transaction.commands) {
    commandEvidence.push({
      label: `Command ${command.index}`,
      value: command.summary,
      raw: command.raw,
    });
    const notes = mutPermissionNotes(command, transaction.inputs, transaction.objectChanges, transaction.status);
    if (notes.length > 0) sawMutPermission = true;
    commandEvidence.push(...notes);
  }
  const commandCount = plural(transaction.commands.length, 'command');
  const commandVerb = transaction.commands.length === 1 ? 'appears' : 'appear';

  const lifecycle = transaction.objectChanges.reduce(
    (totals, change) => ({ ...totals, [change.lifecycle]: totals[change.lifecycle] + 1 }),
    { created: 0, mutated: 0, deleted: 0, other: 0 },
  );
  const balanceEvidence = transaction.balanceChanges.slice(0, 8).map((change) => ({
    label: 'Balance',
    value: balanceLabel(change),
    raw: `${change.coinType}\n${change.amount} base units\n${change.address}`,
  }));

  const gas = transaction.gas;
  const netGas = gas
    ? BigInt(gas.computationCost) + BigInt(gas.storageCost) - BigInt(gas.storageRebate)
    : null;
  const totalGasLabel = netGas !== null && netGas < 0n ? 'Total gas credit' : 'Total gas cost';
  const totalGasAmount = netGas !== null && netGas < 0n ? -netGas : netGas;
  const gasEvidence: EvidenceItem[] = gas ? [
    { label: 'Computation', value: formatSuiAndMist(gas.computationCost) },
    { label: 'Storage', value: formatSuiAndMist(gas.storageCost) },
    { label: 'Rebate', value: formatSuiAndMist(gas.storageRebate) },
    { label: 'Non-refundable', value: formatSuiAndMist(gas.nonRefundableStorageFee) },
    {
      label: totalGasLabel,
      value: formatSuiAndMist(totalGasAmount!.toString()),
      raw: `signed net: ${netGas!.toString()} MIST\ncomputation + storage − storage rebate`,
      emphasis: 'total',
    },
  ] : [];

  const failureBoundary = transaction.status === 'failure'
    ? ' These commands were present in the signed transaction, but their intended changes did not commit.'
    : '';

  const answers: LensAnswer[] = [
    {
      id: 'actor', number: '01', question: 'Who acted?', level: 'observed',
      answer: !transaction.sender || !transaction.gasOwner
        ? 'The returned transaction data did not include enough information to compare the sender and gas payer.'
        : samePayer
          ? 'The sender and gas payer are the same address.'
          : 'The sender authorized the transaction, while a different address supplied the gas payment.',
      evidence: actorEvidence,
      lessonHref: '/learn/objects/ownership-and-access', lessonLabel: 'Learn ownership and access',
    },
    {
      id: 'inputs', number: '02', question: 'What went in?', level: 'decoded',
      answer: `${plural(transaction.inputs.length, 'programmable input')} and ${plural(transaction.gasPayments.length, 'gas-payment object')} were supplied. Pure values are decoded only where command usage or a resolved Move signature gives the bytes a reliable meaning.`,
      evidence: inputEvidence,
      lessonHref: '/learn/transactions/read-the-ptb', lessonLabel: 'Learn to read PTB inputs',
    },
    {
      id: 'commands', number: '03', question: 'What ran?',
      level: sawMutPermission ? 'decoded' : 'observed',
      answer: `${commandCount} ${commandVerb} in order.${failureBoundary}${sawMutPermission ? ' &mut gives a command permission to change an object. Object effects show whether that object changed somewhere in the transaction, not which command changed it.' : ''}`,
      evidence: commandEvidence,
      lessonHref: '/learn/transactions/follow-command-results', lessonLabel: 'Follow command results',
    },
    {
      id: 'effects', number: '04', question: 'What changed?', level: 'observed',
      answer: transaction.status === 'failure'
        ? `The failure receipt records ${plural(transaction.objectChanges.length, 'object effect')}. Do not read the submitted commands as committed application changes.`
        : `${lifecycle.created} created, ${lifecycle.mutated} mutated, ${lifecycle.deleted} deleted, and ${lifecycle.other} other object effects were recorded.`,
      evidence: [...effectEvidence(transaction.objectChanges), ...balanceEvidence],
      lessonHref: '/learn/objects/lifecycle-and-versions', lessonLabel: 'Learn object lifecycle',
    },
    {
      id: 'cost', number: '05', question: 'What did it cost?', level: 'decoded',
      answer: gas && netGas !== null
        ? netGas < 0n
          ? `The total gas credit was ${formatSui((-netGas).toString())} (${formatMist((-netGas).toString())}).`
          : `The total gas cost was ${formatSui(netGas.toString())} (${formatMist(netGas.toString())}).`
        : 'No gas summary was available in the returned effects.',
      evidence: gasEvidence,
      lessonHref: '/learn/transactions/effects-and-cost', lessonLabel: 'Learn gas and storage',
    },
  ];

  return {
    digest: transaction.digest,
    network: transaction.network,
    status: transaction.status,
    summary: summarize(transaction),
    answers,
    rawJson: transaction.rawJson,
  };
}
