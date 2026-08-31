import { describe, expect, test } from 'bun:test';
import type { SuiClientTypes } from '@mysten/sui/client';
import {
  callableMoveParameters,
  decodePureBytes,
  describeMoveParameter,
  moveTypeLabel,
  unknownPureSummary,
} from './move-signature';

type OpenSignature = SuiClientTypes.OpenSignature;

function datatype(
  typeName: string,
  reference: OpenSignature['reference'] = null,
  typeParameters: SuiClientTypes.OpenSignatureBody[] = [],
): OpenSignature {
  return {
    reference,
    body: { $kind: 'datatype', datatype: { typeName, typeParameters } },
  };
}

function primitive(kind: 'u8' | 'u16' | 'u32' | 'u64' | 'u128' | 'u256' | 'bool' | 'address'): OpenSignature {
  return { reference: null, body: { $kind: kind } };
}

const optionType = '0x0000000000000000000000000000000000000000000000000000000000000001::option::Option';

function optionOf(inner: SuiClientTypes.OpenSignatureBody): OpenSignature {
  return datatype(optionType, null, [inner]);
}

describe('describeMoveParameter', () => {
  test('distinguishes immutable and mutable references', () => {
    expect(describeMoveParameter(datatype('0x2::clock::Clock', 'immutable'))).toEqual({
      type: '&0x2::clock::Clock',
      access: 'read-only (&)',
    });
    expect(describeMoveParameter(datatype('0xabc::counter::Counter', 'mutable'))).toEqual({
      type: '&mut 0xabc::counter::Counter',
      access: 'mutable (&mut)',
    });
  });

  test('substitutes transaction type arguments for generic parameters', () => {
    const parameter: OpenSignature = {
      reference: null,
      body: { $kind: 'typeParameter', index: 0 },
    };
    expect(describeMoveParameter(parameter, ['0x2::sui::SUI'])).toEqual({
      type: '0x2::sui::SUI',
      access: 'by value',
    });
  });

  test('preserves every nested type when producing a comparison label', () => {
    const nested = {
      $kind: 'datatype' as const,
      datatype: {
        typeName: optionType,
        typeParameters: [{ $kind: 'vector' as const, vector: { $kind: 'u64' as const } }],
      },
    };
    expect(moveTypeLabel(nested)).toBe('0x1::option::Option<vector<u64>>');
  });
});

describe('callableMoveParameters', () => {
  test('removes the implicit TxContext parameter', () => {
    const counter = datatype('0xabc::counter::Counter', 'mutable');
    const txContext = datatype(
      '0x0000000000000000000000000000000000000000000000000000000000000002::tx_context::TxContext',
      'mutable',
    );
    expect(callableMoveParameters([counter, txContext])).toEqual([counter]);
  });
});

describe('decodePureBytes', () => {
  test('decodes little-endian integers at the signature width', () => {
    expect(decodePureBytes(Uint8Array.of(42), primitive('u8'))).toBe('Pure u8 42');
    expect(decodePureBytes(Uint8Array.of(0xe8, 0x03, 0, 0, 0, 0, 0, 0), primitive('u64'))).toBe('Pure u64 1000');
  });

  test('decodes bool and address only at the exact width', () => {
    expect(decodePureBytes(Uint8Array.of(1), primitive('bool'))).toBe('Pure bool true');
    expect(decodePureBytes(Uint8Array.of(0), primitive('bool'))).toBe('Pure bool false');
    expect(decodePureBytes(Uint8Array.of(2), primitive('bool'))).toBeNull();
    expect(decodePureBytes(Uint8Array.of(1, 0), primitive('bool'))).toBeNull();
  });

  test('keeps vector<u8> visible as a typed byte count', () => {
    const parameter: OpenSignature = {
      reference: null,
      body: { $kind: 'vector', vector: { $kind: 'u8' } },
    };
    expect(decodePureBytes(Uint8Array.of(3, 1, 2, 3), parameter)).toBe('Pure vector<u8> (3 bytes)');
    expect(decodePureBytes(Uint8Array.of(3, 1, 2), parameter)).toBeNull();
    expect(decodePureBytes(Uint8Array.of(2, 1, 2, 3), parameter)).toBeNull();
    expect(decodePureBytes(Uint8Array.of(0x80, 0), parameter)).toBeNull();
    expect(decodePureBytes(Uint8Array.of(0xff, 0xff, 0xff, 0xff, 0x10), parameter)).toBeNull();
  });

  test('keeps ASCII and UTF-8 validation distinct', () => {
    const ascii = datatype('0x1::ascii::String');
    const utf8 = datatype('0x1::string::String');
    const hello = Uint8Array.of(5, 104, 101, 108, 108, 111);
    const eAcute = Uint8Array.of(2, 0xc3, 0xa9);

    expect(decodePureBytes(hello, ascii)).toBe('Pure 0x1::ascii::String "hello"');
    expect(decodePureBytes(eAcute, ascii)).toBeNull();
    expect(decodePureBytes(eAcute, utf8)).toBe('Pure 0x1::string::String "é"');
  });

  test('decodes Option none and some when the inner type is authoritative', () => {
    const u64 = optionOf({ $kind: 'u64' });
    expect(decodePureBytes(Uint8Array.of(0), u64)).toBe('Pure 0x1::option::Option<u64> none');
    expect(decodePureBytes(Uint8Array.of(1, 0xe8, 0x03, 0, 0, 0, 0, 0, 0), u64)).toBe(
      'Pure 0x1::option::Option<u64> some 1000',
    );
    expect(decodePureBytes(Uint8Array.of(2), u64)).toBeNull();
    expect(decodePureBytes(Uint8Array.of(0, 1), u64)).toBeNull();
  });

  test('keeps Option of an unknown struct as none or a remaining-byte count', () => {
    const clock = optionOf({
      $kind: 'datatype',
      datatype: { typeName: '0x2::clock::Clock', typeParameters: [] },
    });
    expect(decodePureBytes(Uint8Array.of(0), clock)).toBe('Pure 0x1::option::Option<0x2::clock::Clock> none');
    expect(decodePureBytes(Uint8Array.of(1, 9, 8, 7), clock)).toBe(
      'Pure 0x1::option::Option<0x2::clock::Clock> some (3 bytes)',
    );
  });

  test('decodes a vector<u8> nested inside Option without counting either length prefix', () => {
    const bytes = optionOf({ $kind: 'vector', vector: { $kind: 'u8' } });
    expect(decodePureBytes(Uint8Array.of(1, 3, 9, 8, 7), bytes)).toBe(
      'Pure 0x1::option::Option<vector<u8>> some (3 bytes)',
    );
  });

  test('decodes generic T from the transaction type arguments', () => {
    const parameter: OpenSignature = {
      reference: null,
      body: { $kind: 'typeParameter', index: 0 },
    };
    expect(decodePureBytes(Uint8Array.of(0xe8, 0x03, 0, 0, 0, 0, 0, 0), parameter, ['u64'])).toBe('Pure u64 1000');
    expect(decodePureBytes(Uint8Array.of(0), parameter, ['0x1::option::Option<u64>'])).toBe(
      'Pure 0x1::option::Option<u64> none',
    );
    expect(decodePureBytes(Uint8Array.of(1, 2, 3), parameter, ['0x2::clock::Clock'])).toBe(
      'Pure 0x2::clock::Clock (3 bytes)',
    );
    expect(decodePureBytes(Uint8Array.of(1, 2, 3), parameter)).toBeNull();
  });

  test('keeps unknown structs as a typed byte count instead of inventing fields', () => {
    const clock = datatype('0x2::clock::Clock');
    expect(decodePureBytes(Uint8Array.of(1, 2, 3), clock)).toBe('Pure 0x2::clock::Clock (3 bytes)');
    expect(unknownPureSummary(Uint8Array.of(1, 2, 3))).toBe('Pure value (3 bytes)');
  });
});
