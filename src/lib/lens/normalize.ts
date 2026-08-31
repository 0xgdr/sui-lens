import { fromBase64 } from '@mysten/sui/utils';
import type { SuiClientTypes } from '@mysten/sui/client';
import type { LiveTransactionResult } from './source';
import {
  callableMoveParameters,
  compactMoveType,
  decodePureBytes,
  describeMoveParameter,
  lookupMoveSignature,
  moveTypeLabel,
  resolveSignatureBody,
  unknownPureSummary,
  type MoveFunctionTarget,
  type MoveSignatureLookup,
} from './move-signature';
import type {
  NormalizedCommand,
  NormalizedInput,
  NormalizedObjectChange,
  NormalizedOwner,
  NormalizedTransaction,
} from './types';

type UnknownRecord = Record<string, unknown>;
type OpenSignature = SuiClientTypes.OpenSignature;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

function isPrimitive(value: JsonValue): value is JsonPrimitive {
  return value === null || typeof value !== 'object';
}

function formatJsonValue(value: JsonValue, depth = 0): string {
  const indent = '  '.repeat(depth);
  const childIndent = '  '.repeat(depth + 1);

  if (isPrimitive(value)) return JSON.stringify(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every(isPrimitive)) {
      const tokens = value.map((item) => JSON.stringify(item));
      const inline = `[${tokens.join(', ')}]`;
      if (childIndent.length + inline.length <= 92) return inline;

      const isByteArray = value.length > 16 && value.every((item) =>
        typeof item === 'number' && Number.isInteger(item) && item >= 0 && item <= 255);
      if (isByteArray) {
        const lines: string[] = [];
        for (let index = 0; index < tokens.length; index += 8) {
          lines.push(tokens.slice(index, index + 8).join(', '));
        }
        return `[\n${lines.map((item) => `${childIndent}${item}`).join(',\n')}\n${indent}]`;
      }

      const lines: string[] = [];
      let line = '';
      for (const token of tokens) {
        const next = line ? `${line}, ${token}` : token;
        if (line && childIndent.length + next.length > 92) {
          lines.push(line);
          line = token;
        } else {
          line = next;
        }
      }
      if (line) lines.push(line);
      return `[\n${lines.map((item) => `${childIndent}${item}`).join(',\n')}\n${indent}]`;
    }

    return `[\n${value.map((item) => `${childIndent}${formatJsonValue(item, depth + 1)}`).join(',\n')}\n${indent}]`;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) return '{}';
  return `{\n${entries.map(([key, item]) => `${childIndent}${JSON.stringify(key)}: ${formatJsonValue(item, depth + 1)}`).join(',\n')}\n${indent}}`;
}

export function formatRawJson(value: unknown): string {
  const serialized = JSON.stringify(
    value,
    (_key, current) => current instanceof Uint8Array ? Array.from(current) : current,
  );
  if (serialized === undefined) return 'null';
  return formatJsonValue(JSON.parse(serialized) as JsonValue);
}

function enumPayload(value: unknown): { kind: string; payload: unknown } {
  if (!isRecord(value)) return { kind: 'Unknown', payload: value };
  const kind = typeof value.$kind === 'string'
    ? value.$kind
    : Object.keys(value).find((key) => key !== '$kind') ?? 'Unknown';
  return { kind, payload: value[kind] };
}

function argumentLabel(value: unknown): string {
  const { kind, payload } = enumPayload(value);
  if (kind === 'GasCoin') return 'GasCoin';
  if (kind === 'Input') return `Input ${String(payload)}`;
  if (kind === 'Result') return `Result ${String(payload)}`;
  if (kind === 'NestedResult' && Array.isArray(payload)) {
    return `NestedResult [${payload.map(String).join(', ')}]`;
  }
  return kind;
}

interface PureHint {
  origin: string;
  parameter: OpenSignature;
  typeArguments: readonly string[];
}

function signatureKind(parameter: OpenSignature, typeArguments: readonly string[] = []): string {
  return moveTypeLabel(resolveSignatureBody(parameter.body, typeArguments));
}

function inputUses(commands: unknown[], signatures?: MoveSignatureLookup): Map<number, PureHint | 'conflict'> {
  const uses = new Map<number, PureHint | 'conflict'>();
  const note = (argument: unknown, hint: PureHint) => {
    const parsed = enumPayload(argument);
    if (parsed.kind !== 'Input' || typeof parsed.payload !== 'number') return;
    const existing = uses.get(parsed.payload);
    if (!existing) {
      uses.set(parsed.payload, hint);
      return;
    }
    if (existing === 'conflict') return;
    if (signatureKind(existing.parameter, existing.typeArguments) !== signatureKind(hint.parameter, hint.typeArguments)) {
      uses.set(parsed.payload, 'conflict');
    }
  };

  for (const command of commands) {
    const { kind, payload } = enumPayload(command);
    if (!isRecord(payload)) continue;
    if (kind === 'SplitCoins' && Array.isArray(payload.amounts)) {
      payload.amounts.forEach((amount) => note(amount, {
        origin: 'split amount',
        parameter: { reference: null, body: { $kind: 'u64' } },
        typeArguments: [],
      }));
    }
    if (kind === 'TransferObjects') {
      note(payload.address, {
        origin: 'recipient address',
        parameter: { reference: null, body: { $kind: 'address' } },
        typeArguments: [],
      });
    }
    if (kind === 'MoveCall') {
      const target: MoveFunctionTarget = {
        package: String(payload.package ?? ''),
        module: String(payload.module ?? ''),
        function: String(payload.function ?? ''),
      };
      const definition = lookupMoveSignature(signatures, target);
      const parameters = definition ? callableMoveParameters(definition.parameters) : null;
      const args = Array.isArray(payload.arguments) ? payload.arguments : [];
      const typeArguments = Array.isArray(payload.typeArguments) ? payload.typeArguments.map(String) : [];
      if (!parameters || parameters.length !== args.length) continue;
      args.forEach((argument, index) => note(argument, {
        origin: 'move call',
        parameter: parameters[index],
        typeArguments,
      }));
    }
  }
  return uses;
}

function objectInputSummary(
  objectKind: string,
  payload: UnknownRecord,
  owners: Map<string, NormalizedOwner>,
): string {
  const objectId = String(payload.objectId ?? 'unknown object');
  if (objectKind === 'SharedObject') {
    return `Shared object ${objectId} (${payload.mutable ? 'mutable' : 'read-only'})`;
  }
  if (objectKind === 'Receiving') {
    return `Receiving object ${objectId}`;
  }

  const owner = owners.get(objectId) ?? owners.get(objectId.toLowerCase());
  if (owner?.kind === 'Immutable') return `Immutable object ${objectId}`;
  if (owner?.kind === 'ObjectOwner') return `Object-owned object ${objectId}`;
  if (owner?.kind === 'AddressOwner') return `Address-owned object ${objectId}`;
  return `Owned or immutable object ${objectId}`;
}

function normalizeInput(
  value: unknown,
  index: number,
  hint: PureHint | 'conflict' | undefined,
  owners: Map<string, NormalizedOwner>,
): NormalizedInput {
  const { kind, payload } = enumPayload(value);
  let summary = kind;

  if (kind === 'Pure' && isRecord(payload) && typeof payload.bytes === 'string') {
    const bytes = fromBase64(payload.bytes);
    if (hint && hint !== 'conflict') {
      const decoded = decodePureBytes(bytes, hint.parameter, hint.typeArguments);
      summary = decoded
        ? hint.origin === 'move call' ? decoded : `${decoded} (${hint.origin})`
        : unknownPureSummary(bytes);
    } else {
      summary = unknownPureSummary(bytes);
    }
  }

  if (kind === 'Object') {
    const object = enumPayload(payload);
    if (isRecord(object.payload)) {
      summary = objectInputSummary(object.kind, object.payload, owners);
    }
  }

  return { index, kind, summary, raw: formatRawJson(value) };
}

function moveCallSummary(payload: UnknownRecord, signatures?: MoveSignatureLookup): string {
  const target: MoveFunctionTarget = {
    package: String(payload.package ?? ''),
    module: String(payload.module ?? ''),
    function: String(payload.function ?? ''),
  };
  const identity = `${compactMoveType(target.package)}::${target.module}::${target.function}`;
  const typeArguments = Array.isArray(payload.typeArguments) ? payload.typeArguments.map(String) : [];
  const typeList = typeArguments.length
    ? `<${typeArguments.map((type) => compactMoveType(type)).join(', ')}>`
    : '';
  const args = Array.isArray(payload.arguments) ? payload.arguments : [];
  if (args.length === 0) return `${identity}${typeList}`;

  const definition = lookupMoveSignature(signatures, target);
  const parameters = definition ? callableMoveParameters(definition.parameters) : null;
  const aligned = Boolean(parameters && parameters.length === args.length);
  const formatted = args.map((argument, index) => {
    const label = argumentLabel(argument);
    if (!aligned || !parameters) return label;
    return `${label} as ${describeMoveParameter(parameters[index], typeArguments).type}`;
  });
  return `${identity}${typeList}(${formatted.join(', ')})`;
}

function normalizeCommand(value: unknown, index: number, signatures?: MoveSignatureLookup): NormalizedCommand {
  const { kind, payload } = enumPayload(value);
  let summary = kind;

  if (isRecord(payload)) {
    if (kind === 'MoveCall') {
      summary = moveCallSummary(payload, signatures);
    } else if (kind === 'SplitCoins') {
      const amounts = Array.isArray(payload.amounts) ? payload.amounts.map(argumentLabel).join(', ') : '';
      summary = `Split ${argumentLabel(payload.coin)} using ${amounts || 'no amount arguments'}`;
    } else if (kind === 'TransferObjects') {
      const objects = Array.isArray(payload.objects) ? payload.objects.map(argumentLabel).join(', ') : '';
      summary = `Transfer ${objects || 'objects'} to ${argumentLabel(payload.address)}`;
    } else if (kind === 'MergeCoins') {
      const sources = Array.isArray(payload.sources) ? payload.sources.map(argumentLabel).join(', ') : '';
      summary = `Merge ${sources || 'coins'} into ${argumentLabel(payload.destination)}`;
    } else if (kind === 'MakeMoveVec') {
      const elements = Array.isArray(payload.elements) ? payload.elements.length : 0;
      summary = `Build a Move vector from ${elements} element${elements === 1 ? '' : 's'}`;
    } else if (kind === 'Publish') {
      const modules = Array.isArray(payload.modules) ? payload.modules.length : 0;
      summary = `Publish ${modules} Move module${modules === 1 ? '' : 's'}`;
    } else if (kind === 'Upgrade') {
      summary = `Upgrade package ${String(payload.package ?? '')}`;
    }
  }

  return { index, kind, summary, raw: formatRawJson(value) };
}

function normalizeOwner(owner: unknown): NormalizedOwner | null {
  if (!owner) return null;
  const { kind, payload } = enumPayload(owner);
  if (kind === 'AddressOwner' || kind === 'ObjectOwner') return { kind, value: String(payload) };
  if (kind === 'Shared' && isRecord(payload)) {
    return { kind, value: `initial version ${String(payload.initialSharedVersion ?? 'unknown')}` };
  }
  if (kind === 'Immutable') return { kind, value: 'immutable' };
  if (kind === 'ConsensusAddressOwner' && isRecord(payload)) {
    return { kind, value: String(payload.owner ?? 'unknown') };
  }
  return { kind, value: String(payload ?? kind) };
}

function inputOwnersFromEffects(changes: SuiClientTypes.ChangedObject[]): Map<string, NormalizedOwner> {
  const owners = new Map<string, NormalizedOwner>();
  for (const change of changes) {
    const owner = normalizeOwner(change.inputOwner);
    if (!owner) continue;
    owners.set(change.objectId, owner);
    owners.set(change.objectId.toLowerCase(), owner);
  }
  return owners;
}

function normalizeObjectChange(
  change: SuiClientTypes.ChangedObject,
  objectTypes: Record<string, string>,
): NormalizedObjectChange {
  const lifecycle = change.idOperation === 'Created'
    ? 'created'
    : change.idOperation === 'Deleted' || change.outputState === 'DoesNotExist'
      ? 'deleted'
      : change.inputState === 'Exists' && change.outputState.endsWith('Write')
        ? 'mutated'
        : 'other';

  return {
    objectId: change.objectId,
    lifecycle,
    objectType: objectTypes[change.objectId],
    inputVersion: change.inputVersion,
    outputVersion: change.outputVersion,
    inputOwner: normalizeOwner(change.inputOwner),
    outputOwner: normalizeOwner(change.outputOwner),
  };
}

export function normalizeTransaction(
  result: LiveTransactionResult,
  signatures?: MoveSignatureLookup,
): NormalizedTransaction {
  const transaction = result.Transaction ?? result.FailedTransaction;
  const txData = transaction.transaction;
  const commands = txData?.commands ?? [];
  const uses = inputUses(commands, signatures);
  const effects = transaction.effects;
  const owners = inputOwnersFromEffects(effects?.changedObjects ?? []);

  return {
    digest: transaction.digest,
    network: 'mainnet',
    status: transaction.status.success ? 'success' : 'failure',
    error: transaction.status.success ? null : transaction.status.error.message,
    sender: txData?.sender ?? null,
    gasOwner: txData?.gasData.owner ?? null,
    gasPayments: (txData?.gasData.payment ?? []).map((payment) => ({
      ...payment,
      version: String(payment.version),
    })),
    inputs: (txData?.inputs ?? []).map((input, index) => normalizeInput(input, index, uses.get(index), owners)),
    commands: commands.map((command, index) => normalizeCommand(command, index, signatures)),
    objectChanges: (effects?.changedObjects ?? []).map((change) =>
      normalizeObjectChange(change, transaction.objectTypes ?? {})),
    balanceChanges: transaction.balanceChanges ?? [],
    gas: effects?.gasUsed ?? null,
    rawJson: formatRawJson(result),
  };
}
