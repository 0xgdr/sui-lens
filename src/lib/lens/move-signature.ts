import { parseStructTag, type StructTag } from '@mysten/sui/utils';
import type { SuiClientTypes } from '@mysten/sui/client';

type OpenSignature = SuiClientTypes.OpenSignature;
type OpenSignatureBody = SuiClientTypes.OpenSignatureBody;

export type MoveFunctionSignature = SuiClientTypes.FunctionResponse;

export type MoveSignatureLookup = ReadonlyMap<string, MoveFunctionSignature | null>;

export interface MoveFunctionTarget {
  package: string;
  module: string;
  function: string;
}

export type MoveParameterAccess = 'read-only (&)' | 'mutable (&mut)' | 'by value' | 'unknown reference';

export interface MoveParameterDescription {
  type: string;
  access: MoveParameterAccess;
}

const INTEGER_WIDTHS: Record<string, number> = {
  u8: 1,
  u16: 2,
  u32: 4,
  u64: 8,
  u128: 16,
  u256: 32,
};

const PRIMITIVE_KINDS = new Set(['u8', 'u16', 'u32', 'u64', 'u128', 'u256', 'bool', 'address']);

export function moveFunctionKey(target: MoveFunctionTarget): string {
  return `${target.package}::${target.module}::${target.function}`;
}

export function compactMoveType(type: string): string {
  return type.replace(/0x0{1,63}/g, '0x');
}

function canonicalPackageId(packageId: string): string {
  const hex = packageId.replace(/^0x/i, '').replace(/^0+/, '') || '0';
  return `0x${hex.toLowerCase()}`;
}

function isStructTag(value: unknown): value is StructTag {
  return typeof value === 'object' && value !== null
    && 'address' in value && 'module' in value && 'name' in value && 'typeParams' in value;
}

function bodyFromStructTag(tag: StructTag): OpenSignatureBody | null {
  const typeParameters: OpenSignatureBody[] = [];
  for (const param of tag.typeParams) {
    const body = typeof param === 'string'
      ? bodyFromTypeArgument(param)
      : isStructTag(param)
        ? bodyFromStructTag(param)
        : null;
    if (!body) return null;
    typeParameters.push(body);
  }
  return {
    $kind: 'datatype',
    datatype: {
      typeName: `${tag.address}::${tag.module}::${tag.name}`,
      typeParameters,
    },
  };
}

function bodyFromTypeArgument(type: string): OpenSignatureBody | null {
  const trimmed = type.trim();
  if (PRIMITIVE_KINDS.has(trimmed)) return { $kind: trimmed } as OpenSignatureBody;
  const vector = trimmed.match(/^vector<(.+)>$/);
  if (vector) {
    const inner = bodyFromTypeArgument(vector[1]);
    return inner ? { $kind: 'vector', vector: inner } : null;
  }
  try {
    return bodyFromStructTag(parseStructTag(trimmed));
  } catch {
    return null;
  }
}

export function resolveSignatureBody(
  body: OpenSignatureBody,
  typeArguments: readonly string[] = [],
): OpenSignatureBody {
  if (body.$kind === 'typeParameter') {
    const typeArg = typeArguments[body.index];
    if (typeof typeArg !== 'string' || typeArg.length === 0) return body;
    return bodyFromTypeArgument(typeArg) ?? body;
  }
  if (body.$kind === 'vector') {
    return { $kind: 'vector', vector: resolveSignatureBody(body.vector, typeArguments) };
  }
  if (body.$kind === 'datatype') {
    return {
      $kind: 'datatype',
      datatype: {
        typeName: body.datatype.typeName,
        typeParameters: body.datatype.typeParameters.map((parameter) =>
          resolveSignatureBody(parameter, typeArguments)),
      },
    };
  }
  return body;
}

function formatSignatureBody(body: OpenSignatureBody, typeArguments: readonly string[]): string {
  const resolved = resolveSignatureBody(body, typeArguments);
  switch (resolved.$kind) {
    case 'vector':
      return `vector<${formatSignatureBody(resolved.vector, typeArguments)}>`;
    case 'datatype': {
      const parameters = resolved.datatype.typeParameters;
      const suffix = parameters.length > 0
        ? `<${parameters.map((parameter) => formatSignatureBody(parameter, typeArguments)).join(', ')}>`
        : '';
      return `${resolved.datatype.typeName}${suffix}`;
    }
    case 'typeParameter':
      return typeArguments[resolved.index] ?? `T${resolved.index}`;
    default:
      return resolved.$kind;
  }
}

export function moveTypeLabel(body: OpenSignatureBody, typeArguments: readonly string[] = []): string {
  return compactMoveType(formatSignatureBody(body, typeArguments));
}

function isTxContext(parameter: OpenSignature): boolean {
  if (parameter.body.$kind !== 'datatype') return false;
  const [packageId, module, name] = parameter.body.datatype.typeName.split('::');
  return Boolean(
    packageId
    && canonicalPackageId(packageId) === '0x2'
    && module === 'tx_context'
    && name === 'TxContext',
  );
}

export function callableMoveParameters(parameters: readonly OpenSignature[]): OpenSignature[] {
  const lastParameter = parameters.at(-1);
  return lastParameter && isTxContext(lastParameter)
    ? parameters.slice(0, -1)
    : [...parameters];
}

export function describeMoveParameter(
  parameter: OpenSignature,
  typeArguments: readonly string[] = [],
): MoveParameterDescription {
  const body = moveTypeLabel(parameter.body, typeArguments);

  switch (parameter.reference) {
    case 'immutable':
      return { type: `&${body}`, access: 'read-only (&)' };
    case 'mutable':
      return { type: `&mut ${body}`, access: 'mutable (&mut)' };
    case 'unknown':
      return { type: `&? ${body}`, access: 'unknown reference' };
    default:
      return { type: body, access: 'by value' };
  }
}

export function lookupMoveSignature(
  signatures: MoveSignatureLookup | undefined,
  target: MoveFunctionTarget,
): MoveFunctionSignature | null {
  return signatures?.get(moveFunctionKey(target)) ?? null;
}

function decodeLittleEndian(bytes: Uint8Array): string {
  let value = 0n;
  for (let index = bytes.length - 1; index >= 0; index -= 1) {
    value = (value << 8n) + BigInt(bytes[index]);
  }
  return value.toString();
}

function bytesToHex(bytes: Uint8Array): string {
  return `0x${Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function isVectorOf(body: OpenSignatureBody, kind: OpenSignatureBody['$kind']): boolean {
  return body.$kind === 'vector' && body.vector.$kind === kind;
}

function datatypeParts(typeName: string): { packageId: string; module: string; name: string } | null {
  const parts = typeName.split('::');
  if (parts.length !== 3) return null;
  return { packageId: canonicalPackageId(parts[0]), module: parts[1], name: parts[2] };
}

function readUleb128(bytes: Uint8Array, offset: number): { value: number; next: number } | null {
  let value = 0;
  let shift = 0;
  let index = offset;
  while (index < bytes.length && index - offset < 5) {
    const byte = bytes[index];
    index += 1;
    const digit = byte & 0x7f;
    if (shift === 28 && digit > 0x0f) return null;
    value += digit * (2 ** shift);
    if (byte < 0x80) {
      if (index - offset > 1 && digit === 0) return null;
      return { value, next: index };
    }
    shift += 7;
  }
  return null;
}

function decodeUtf8(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

interface DecodedPure {
  next: number;
  value: string;
}

function decodeBody(
  bytes: Uint8Array,
  offset: number,
  body: OpenSignatureBody,
  typeArguments: readonly string[],
): DecodedPure | null {
  const resolved = resolveSignatureBody(body, typeArguments);

  if (resolved.$kind in INTEGER_WIDTHS) {
    const width = INTEGER_WIDTHS[resolved.$kind];
    if (offset + width > bytes.length) return null;
    return { next: offset + width, value: decodeLittleEndian(bytes.subarray(offset, offset + width)) };
  }

  if (resolved.$kind === 'bool') {
    if (offset >= bytes.length || (bytes[offset] !== 0 && bytes[offset] !== 1)) return null;
    return { next: offset + 1, value: bytes[offset] === 1 ? 'true' : 'false' };
  }

  if (resolved.$kind === 'address') {
    if (offset + 32 > bytes.length) return null;
    return { next: offset + 32, value: bytesToHex(bytes.subarray(offset, offset + 32)) };
  }

  if (isVectorOf(resolved, 'u8')) {
    const length = readUleb128(bytes, offset);
    if (!length || length.next + length.value > bytes.length) return null;
    const next = length.next + length.value;
    return { next, value: `(${length.value.toLocaleString()} bytes)` };
  }

  if (resolved.$kind === 'datatype') {
    const parts = datatypeParts(resolved.datatype.typeName);

    if (parts?.packageId === '0x1' && parts.module === 'option' && parts.name === 'Option') {
      const inner = resolved.datatype.typeParameters[0];
      if (!inner) return null;
      const length = readUleb128(bytes, offset);
      if (!length || (length.value !== 0 && length.value !== 1)) return null;
      if (length.value === 0) return { next: length.next, value: 'none' };
      const decoded = decodeBody(bytes, length.next, inner, typeArguments);
      if (!decoded) return null;
      return { next: decoded.next, value: `some ${decoded.value}` };
    }

    if (parts?.packageId === '0x1' && (parts.module === 'string' || parts.module === 'ascii') && parts.name === 'String') {
      const length = readUleb128(bytes, offset);
      if (!length || length.next + length.value > bytes.length) return null;
      const content = bytes.subarray(length.next, length.next + length.value);
      if (parts.module === 'ascii' && content.some((byte) => byte > 0x7f)) return null;
      const text = decodeUtf8(content);
      if (text === null) return null;
      return { next: length.next + length.value, value: JSON.stringify(text) };
    }

    if (parts?.packageId === '0x2' && parts.module === 'object' && parts.name === 'ID') {
      if (offset + 32 > bytes.length) return null;
      return { next: offset + 32, value: bytesToHex(bytes.subarray(offset, offset + 32)) };
    }

    return { next: bytes.length, value: `(${(bytes.length - offset).toLocaleString()} bytes)` };
  }

  return null;
}

/** Decode pure bytes only when `parameter` supplies an authoritative type. */
export function decodePureBytes(bytes: Uint8Array, parameter: OpenSignature, typeArguments: readonly string[] = []): string | null {
  const resolved = resolveSignatureBody(parameter.body, typeArguments);
  const decoded = decodeBody(bytes, 0, resolved, typeArguments);
  if (!decoded || decoded.next !== bytes.length) return null;
  return `Pure ${moveTypeLabel(resolved, typeArguments)} ${decoded.value}`;
}

export function unknownPureSummary(bytes: Uint8Array): string {
  return `Pure value (${bytes.length.toLocaleString()} bytes)`;
}
