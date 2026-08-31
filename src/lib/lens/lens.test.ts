import { describe, expect, test } from 'bun:test';
import type { SuiClientTypes } from '@mysten/sui/client';
import { explainTransaction } from './explain';
import { formatRawJson, normalizeTransaction } from './normalize';
import { collectMoveCallTargets } from './source';
import type { LiveTransactionResult } from './source';
import type { MoveFunctionSignature, MoveSignatureLookup } from './move-signature';

const sender = `0x${'aa'.repeat(32)}`;
const recipient = `0x${'bb'.repeat(32)}`;
const suiCoin = '0x0000000000000000000000000000000000000000000000000000000000000002::coin::Coin<0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI>';

function fixture(success = true): LiveTransactionResult {
  const transaction = {
    digest: 'GWJNiU5UHbcpd8UNgqQkiANG3jY8pjKHXa9AhHx68xzX',
    signatures: [],
    epoch: '752',
    status: success
      ? { success: true as const, error: null }
      : { success: false as const, error: { message: 'MoveAbort in command 0' } },
    transaction: {
      version: 2 as const,
      sender,
      expiration: { $kind: 'None' as const, None: true as const },
      gasData: {
        budget: '3456000', price: '740', owner: sender,
        payment: [{ objectId: '0x1', version: '8', digest: 'gas-digest' }],
      },
      inputs: [
        { $kind: 'Pure' as const, Pure: { bytes: 'AMqaOwAAAAA=' } },
        { $kind: 'Pure' as const, Pure: { bytes: 'u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7s=' } },
      ],
      commands: [
        { $kind: 'SplitCoins' as const, SplitCoins: { coin: { $kind: 'GasCoin' as const, GasCoin: true as const }, amounts: [{ $kind: 'Input' as const, Input: 0 }] } },
        { $kind: 'TransferObjects' as const, TransferObjects: { objects: [{ $kind: 'NestedResult' as const, NestedResult: [0, 0] as [number, number] }], address: { $kind: 'Input' as const, Input: 1 } } },
      ],
    },
    effects: {
      bcs: null, version: 2, status: success
        ? { success: true as const, error: null }
        : { success: false as const, error: { message: 'MoveAbort in command 0' } },
      gasUsed: { computationCost: '740000', storageCost: '1976000', storageRebate: '2934360', nonRefundableStorageFee: '29640' },
      transactionDigest: 'GWJNiU5UHbcpd8UNgqQkiANG3jY8pjKHXa9AhHx68xzX',
      gasObject: null, eventsDigest: null, dependencies: [], lamportVersion: '9',
      changedObjects: [{
        objectId: '0x2', inputState: 'DoesNotExist' as const, inputVersion: null, inputDigest: null, inputOwner: null,
        outputState: 'ObjectWrite' as const, outputVersion: '9', outputDigest: 'created-digest',
        outputOwner: { $kind: 'AddressOwner' as const, AddressOwner: recipient }, idOperation: 'Created' as const,
      }],
      unchangedConsensusObjects: [], auxiliaryDataDigest: null,
    },
    objectTypes: { '0x2': suiCoin },
    balanceChanges: [{ coinType: '0x2::sui::SUI', address: recipient, amount: '1000000000' }],
    events: undefined,
    bcs: undefined,
  };

  return (success
    ? { $kind: 'Transaction', Transaction: transaction }
    : { $kind: 'FailedTransaction', FailedTransaction: transaction }) as unknown as LiveTransactionResult;
}

describe('Lens transaction pipeline', () => {
  test('keeps primitive and BCS byte arrays compact without changing the JSON', () => {
    const value = {
      nestedResult: [0, 0],
      bcs: Uint8Array.from({ length: 40 }, (_value, index) => index),
      objects: [{ id: '0x1' }],
    };
    const formatted = formatRawJson(value);

    expect(formatted).toContain('"nestedResult": [0, 0]');
    expect(formatted).toContain('0, 1, 2, 3, 4, 5, 6, 7,\n');
    expect(formatted).toContain('8, 9, 10, 11, 12, 13, 14, 15,\n');
    expect(formatted.split('\n').some((line) => /^\s+\d+,?$/.test(line))).toBe(false);
    expect(JSON.parse(formatted)).toEqual({
      nestedResult: [0, 0],
      bcs: Array.from({ length: 40 }, (_value, index) => index),
      objects: [{ id: '0x1' }],
    });
  });

  test('decodes only command-qualified pure inputs', () => {
    const normalized = normalizeTransaction(fixture());
    expect(normalized.inputs[0].summary).toBe('Pure u64 1000000000 (split amount)');
    expect(normalized.inputs[1].summary).toBe(`Pure address ${recipient} (recipient address)`);
  });

  test('explains the worked transfer through all five questions', () => {
    const report = explainTransaction(normalizeTransaction(fixture()));
    expect(report.summary).toContain("address's net balance rose by 1 SUI");
    expect(report.answers.map((answer) => answer.id)).toEqual(['actor', 'inputs', 'commands', 'effects', 'cost']);
    expect(report.answers.find((answer) => answer.id === 'effects')?.evidence[0].value).toContain('Coin<SUI>');
    const cost = report.answers.find((answer) => answer.id === 'cost');
    expect(cost?.answer).toBe('The total gas credit was 0.00021836 SUI (218,360 MIST).');
    expect(cost?.evidence.map((item) => item.value)).toContain('0.00074 SUI (740,000 MIST)');
    expect(cost?.evidence.at(-1)).toMatchObject({
      label: 'Total gas credit',
      value: '0.00021836 SUI (218,360 MIST)',
      emphasis: 'total',
    });
  });

  test('labels a positive net amount as the total gas cost', () => {
    const normalized = normalizeTransaction(fixture());
    normalized.gas!.storageRebate = '0';
    const cost = explainTransaction(normalized).answers.find((answer) => answer.id === 'cost');
    expect(cost?.answer).toBe('The total gas cost was 0.002716 SUI (2,716,000 MIST).');
    expect(cost?.evidence.at(-1)?.label).toBe('Total gas cost');
  });

  test('does not describe failed commands as committed changes', () => {
    const report = explainTransaction(normalizeTransaction(fixture(false)));
    expect(report.status).toBe('failure');
    expect(report.summary).toContain('did not commit');
    expect(report.answers.find((answer) => answer.id === 'commands')?.answer).toContain('did not commit');
    expect(report.answers.find((answer) => answer.id === 'commands')?.evidence[0]).toMatchObject({
      label: 'Failure',
      value: 'MoveAbort in command 0',
    });
    expect(report.answers.find((answer) => answer.id === 'commands')?.evidence[0]?.raw).toBeUndefined();
  });

  test('does not invent different actors when actor fields are missing', () => {
    const transaction = normalizeTransaction(fixture());
    transaction.sender = null;
    transaction.gasOwner = null;

    const actor = explainTransaction(transaction).answers.find((answer) => answer.id === 'actor');
    expect(actor?.answer).toContain('did not include enough information');
    expect(actor?.answer).not.toContain('different address');
  });
});


const sharedId = '0x1111111111111111111111111111111111111111111111111111111111111111';
const immutableId = '0x2222222222222222222222222222222222222222222222222222222222222222';
const objectOwnedId = '0x3333333333333333333333333333333333333333333333333333333333333333';
const receivingId = '0x4444444444444444444444444444444444444444444444444444444444444444';
const parentId = '0x5555555555555555555555555555555555555555555555555555555555555555';
const pkg = '0x0000000000000000000000000000000000000000000000000000000000000002';
const optionType = '0x0000000000000000000000000000000000000000000000000000000000000001::option::Option';

function datatype(
  typeName: string,
  reference: SuiClientTypes.OpenSignature['reference'] = null,
  typeParameters: SuiClientTypes.OpenSignatureBody[] = [],
): SuiClientTypes.OpenSignature {
  return { reference, body: { $kind: 'datatype', datatype: { typeName, typeParameters } } };
}

function primitive(kind: 'u8' | 'u64' | 'bool' | 'address'): SuiClientTypes.OpenSignature {
  return { reference: null, body: { $kind: kind } };
}

function moveSignature(name: string, parameters: SuiClientTypes.OpenSignature[]): MoveFunctionSignature {
  return {
    packageId: pkg,
    moduleName: 'trail',
    name,
    visibility: 'public',
    isEntry: false,
    typeParameters: [],
    parameters,
    returns: [],
  };
}

function objectChange(
  objectId: string,
  inputOwner: SuiClientTypes.ObjectOwner,
): SuiClientTypes.ChangedObject {
  return {
    objectId,
    inputState: 'Exists',
    inputVersion: '3',
    inputDigest: 'input-digest',
    inputOwner,
    outputState: 'Unknown',
    outputVersion: null,
    outputDigest: null,
    outputOwner: null,
    idOperation: 'None',
  };
}

function mutatedChange(objectId: string): SuiClientTypes.ChangedObject {
  return {
    objectId,
    inputState: 'Exists',
    inputVersion: '3',
    inputDigest: 'input-digest',
    inputOwner: { $kind: 'Shared', Shared: { initialSharedVersion: '1' } },
    outputState: 'ObjectWrite',
    outputVersion: '4',
    outputDigest: 'output-digest',
    outputOwner: { $kind: 'Shared', Shared: { initialSharedVersion: '1' } },
    idOperation: 'None',
  };
}

function moveCallFixture(args: {
  inputs: unknown[];
  arguments: unknown[];
  typeArguments?: string[];
  functionName?: string;
  commands?: unknown[];
  changedObjects?: SuiClientTypes.ChangedObject[];
  success?: boolean;
}): LiveTransactionResult {
  const success = args.success !== false;
  const transaction = {
    digest: 'MoveCallFixtureDigest11111111111111111111111',
    signatures: [],
    epoch: '1',
    status: success
      ? { success: true as const, error: null }
      : { success: false as const, error: { message: 'MoveAbort in command 0' } },
    transaction: {
      version: 2 as const,
      sender,
      expiration: { $kind: 'None' as const, None: true as const },
      gasData: {
        budget: '1', price: '1', owner: sender,
        payment: [{ objectId: '0x1', version: '1', digest: 'gas-digest' }],
      },
      inputs: args.inputs,
      commands: args.commands ?? [{
        $kind: 'MoveCall' as const,
        MoveCall: {
          package: pkg,
          module: 'trail',
          function: args.functionName ?? 'check_in',
          typeArguments: args.typeArguments ?? [],
          arguments: args.arguments,
        },
      }],
    },
    effects: {
      bcs: null, version: 2, status: success
        ? { success: true as const, error: null }
        : { success: false as const, error: { message: 'MoveAbort in command 0' } },
      gasUsed: { computationCost: '1', storageCost: '1', storageRebate: '0', nonRefundableStorageFee: '0' },
      transactionDigest: 'MoveCallFixtureDigest11111111111111111111111',
      gasObject: null, eventsDigest: null, dependencies: [], lamportVersion: '4',
      changedObjects: args.changedObjects ?? [],
      unchangedConsensusObjects: [], auxiliaryDataDigest: null,
    },
    objectTypes: {},
    balanceChanges: [],
    events: undefined,
    bcs: undefined,
  };

  return (success
    ? { $kind: 'Transaction', Transaction: transaction }
    : { $kind: 'FailedTransaction', FailedTransaction: transaction }) as unknown as LiveTransactionResult;
}

describe('Move call argument decoding', () => {
  test('labels shared, immutable, object-owned, and receiving inputs from observed kinds', () => {
    const result = moveCallFixture({
      inputs: [
        { $kind: 'Object', Object: { $kind: 'SharedObject', SharedObject: { objectId: sharedId, initialSharedVersion: '1', mutable: true } } },
        { $kind: 'Object', Object: { $kind: 'ImmOrOwnedObject', ImmOrOwnedObject: { objectId: immutableId, version: '9', digest: 'imm-digest' } } },
        { $kind: 'Object', Object: { $kind: 'ImmOrOwnedObject', ImmOrOwnedObject: { objectId: objectOwnedId, version: '2', digest: 'owned-digest' } } },
        { $kind: 'Object', Object: { $kind: 'Receiving', Receiving: { objectId: receivingId, version: '6', digest: 'recv-digest' } } },
      ],
      arguments: [
        { $kind: 'Input', Input: 0 },
        { $kind: 'Input', Input: 1 },
        { $kind: 'Input', Input: 2 },
        { $kind: 'Input', Input: 3 },
      ],
      changedObjects: [
        objectChange(immutableId, { $kind: 'Immutable', Immutable: true }),
        objectChange(objectOwnedId, { $kind: 'ObjectOwner', ObjectOwner: parentId }),
      ],
    });

    const normalized = normalizeTransaction(result);
    expect(normalized.inputs.map((input) => input.summary)).toEqual([
      `Shared object ${sharedId} (mutable)`,
      `Immutable object ${immutableId}`,
      `Object-owned object ${objectOwnedId}`,
      `Receiving object ${receivingId}`,
    ]);
  });

  test('keeps unknown pure bytes as a count until a signature makes decoding safe', () => {
    const bytes = 'BAECAwQ=';
    const result = moveCallFixture({
      inputs: [{ $kind: 'Pure', Pure: { bytes } }],
      arguments: [{ $kind: 'Input', Input: 0 }],
    });

    expect(normalizeTransaction(result).inputs[0].summary).toBe('Pure value (5 bytes)');

    const signatures: MoveSignatureLookup = new Map([
      [`${pkg}::trail::check_in`, moveSignature('check_in', [
        { reference: null, body: { $kind: 'vector', vector: { $kind: 'u8' } } },
        datatype(`${pkg}::tx_context::TxContext`, 'mutable'),
      ])],
    ]);
    expect(normalizeTransaction(result, signatures).inputs[0].summary).toBe('Pure vector<u8> (4 bytes)');
  });

  test('decodes Move-call pure arguments from the resolved signature and strips TxContext', () => {
    const result = moveCallFixture({
      inputs: [
        { $kind: 'Pure', Pure: { bytes: '6AMAAAAAAAA=' } },
        { $kind: 'Pure', Pure: { bytes: 'AQ==' } },
        { $kind: 'Pure', Pure: { bytes: 'u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7s=' } },
      ],
      arguments: [
        { $kind: 'Input', Input: 0 },
        { $kind: 'Input', Input: 1 },
        { $kind: 'Input', Input: 2 },
      ],
      functionName: 'record',
    });
    const signatures: MoveSignatureLookup = new Map([
      [`${pkg}::trail::record`, moveSignature('record', [
        primitive('u64'),
        primitive('bool'),
        primitive('address'),
        datatype(`${pkg}::tx_context::TxContext`, 'mutable'),
      ])],
    ]);

    const normalized = normalizeTransaction(result, signatures);
    expect(normalized.inputs.map((input) => input.summary)).toEqual([
      'Pure u64 1000',
      'Pure bool true',
      `Pure address ${recipient}`,
    ]);
    expect(normalized.commands[0].summary).toBe(
      `0x2::trail::record(Input 0 as u64, Input 1 as bool, Input 2 as address)`,
    );
  });

  test('does not invent decoded values when the signature is missing or does not match', () => {
    const result = moveCallFixture({
      inputs: [{ $kind: 'Pure', Pure: { bytes: '6AMAAAAAAAA=' } }],
      arguments: [{ $kind: 'Input', Input: 0 }, { $kind: 'Input', Input: 1 }],
    });
    const mismatched: MoveSignatureLookup = new Map([
      [`${pkg}::trail::check_in`, moveSignature('check_in', [primitive('u64')])],
    ]);

    expect(normalizeTransaction(result).inputs[0].summary).toBe('Pure value (8 bytes)');
    expect(normalizeTransaction(result, mismatched).inputs[0].summary).toBe('Pure value (8 bytes)');
    expect(normalizeTransaction(result).commands[0].summary).toBe('0x2::trail::check_in(Input 0, Input 1)');
  });

  test('collects unique Move call targets for source signature lookup', () => {
    const result = moveCallFixture({
      inputs: [],
      arguments: [],
    });
    expect(collectMoveCallTargets(result)).toEqual([
      { package: pkg, module: 'trail', function: 'check_in' },
    ]);
    expect(collectMoveCallTargets(fixture())).toEqual([]);
  });

  test('explains signature-backed pure decoding without inventing fields', () => {
    const result = moveCallFixture({
      inputs: [{ $kind: 'Pure', Pure: { bytes: '6AMAAAAAAAA=' } }],
      arguments: [{ $kind: 'Input', Input: 0 }],
      functionName: 'record',
    });
    const signatures: MoveSignatureLookup = new Map([
      [`${pkg}::trail::record`, moveSignature('record', [primitive('u64')])],
    ]);
    const report = explainTransaction(normalizeTransaction(result, signatures));
    const inputs = report.answers.find((answer) => answer.id === 'inputs');
    expect(inputs?.evidence.some((item) => item.value === 'Pure u64 1000')).toBe(true);
    expect(inputs?.answer).toContain('resolved Move signature');
  });

  test('does not decode an input reused with conflicting nested Move types', () => {
    const moveCall = (functionName: string) => ({
      $kind: 'MoveCall' as const,
      MoveCall: {
        package: pkg,
        module: 'trail',
        function: functionName,
        typeArguments: [],
        arguments: [{ $kind: 'Input' as const, Input: 0 }],
      },
    });
    const optionVector = (kind: 'u8' | 'u64') => datatype(optionType, null, [
      { $kind: 'vector', vector: { $kind: kind } },
    ]);
    const result = moveCallFixture({
      inputs: [{ $kind: 'Pure', Pure: { bytes: 'AQEJ' } }],
      arguments: [],
      commands: [moveCall('bytes'), moveCall('numbers')],
    });
    const signatures: MoveSignatureLookup = new Map([
      [`${pkg}::trail::bytes`, moveSignature('bytes', [optionVector('u8')])],
      [`${pkg}::trail::numbers`, moveSignature('numbers', [optionVector('u64')])],
    ]);

    expect(normalizeTransaction(result, signatures).inputs[0].summary).toBe('Pure value (3 bytes)');
  });
  test('decodes Option, generic T, and unknown structs from the resolved signature', () => {
    const optionBytes = 'AegDAAAAAAAA'; // [1, 0xe8, 0x03, 0, 0, 0, 0, 0, 0]
    const result = moveCallFixture({
      inputs: [
        { $kind: 'Pure', Pure: { bytes: optionBytes } },
        { $kind: 'Pure', Pure: { bytes: '6AMAAAAAAAA=' } },
        { $kind: 'Pure', Pure: { bytes: 'AQID' } },
      ],
      arguments: [
        { $kind: 'Input', Input: 0 },
        { $kind: 'Input', Input: 1 },
        { $kind: 'Input', Input: 2 },
      ],
      typeArguments: ['u64'],
      functionName: 'stash',
    });
    const signatures: MoveSignatureLookup = new Map([
      [`${pkg}::trail::stash`, moveSignature('stash', [
        datatype(optionType, null, [{ $kind: 'u64' }]),
        { reference: null, body: { $kind: 'typeParameter', index: 0 } },
        datatype('0x2::clock::Clock'),
      ])],
    ]);

    const normalized = normalizeTransaction(result, signatures);
    expect(normalized.inputs.map((input) => input.summary)).toEqual([
      'Pure 0x1::option::Option<u64> some 1000',
      'Pure u64 1000',
      'Pure 0x2::clock::Clock (3 bytes)',
    ]);
    expect(normalized.commands[0].summary).toBe(
      '0x2::trail::stash<u64>(Input 0 as 0x1::option::Option<u64>, Input 1 as u64, Input 2 as 0x2::clock::Clock)',
    );

    const report = explainTransaction(normalized);
    const inputs = report.answers.find((answer) => answer.id === 'inputs');
    expect(inputs?.evidence.map((item) => item.value)).toEqual(expect.arrayContaining([
      'Pure 0x1::option::Option<u64> some 1000',
      'Pure u64 1000',
      'Pure 0x2::clock::Clock (3 bytes)',
    ]));
    expect(inputs?.evidence.some((item) => /field|vec:|contents/i.test(item.value))).toBe(false);
  });

});

describe('&mut permission vs object-effect writes', () => {
  const clock = datatype('0x2::clock::Clock', 'immutable');
  const counter = datatype('0xabc::counter::Counter', 'mutable');
  const signatures: MoveSignatureLookup = new Map([
    [`${pkg}::trail::tick`, moveSignature('tick', [counter, clock])],
  ]);

  test('keeps a transaction-level write separate from the command that had &mut permission', () => {
    const result = moveCallFixture({
      inputs: [
        { $kind: 'Object', Object: { $kind: 'SharedObject', SharedObject: { objectId: sharedId, initialSharedVersion: '1', mutable: true } } },
        { $kind: 'Object', Object: { $kind: 'SharedObject', SharedObject: { objectId: immutableId, initialSharedVersion: '1', mutable: false } } },
      ],
      arguments: [{ $kind: 'Input', Input: 0 }, { $kind: 'Input', Input: 1 }],
      functionName: 'tick',
      changedObjects: [mutatedChange(sharedId)],
    });
    const report = explainTransaction(normalizeTransaction(result, signatures));
    const commands = report.answers.find((answer) => answer.id === 'commands');
    expect(commands?.level).toBe('decoded');
    expect(commands?.answer).toContain('1 command appears in order');
    expect(commands?.answer).toContain('not which command changed it');
    expect(commands?.evidence.some((item) => item.value.includes('changed somewhere in the transaction'))).toBe(true);
    expect(commands?.evidence.some((item) => item.value.includes('do not identify which command changed it'))).toBe(true);
    expect(commands?.evidence.some((item) => /invent|must have written|therefore mutated/i.test(item.value))).toBe(false);
  });

  test('keeps unused &mut honest when object effects show no write', () => {
    const result = moveCallFixture({
      inputs: [
        { $kind: 'Object', Object: { $kind: 'SharedObject', SharedObject: { objectId: sharedId, initialSharedVersion: '1', mutable: true } } },
        { $kind: 'Object', Object: { $kind: 'SharedObject', SharedObject: { objectId: immutableId, initialSharedVersion: '1', mutable: false } } },
      ],
      arguments: [{ $kind: 'Input', Input: 0 }, { $kind: 'Input', Input: 1 }],
      functionName: 'tick',
      changedObjects: [objectChange(sharedId, { $kind: 'Shared', Shared: { initialSharedVersion: '1' } })],
    });
    const report = explainTransaction(normalizeTransaction(result, signatures));
    const commands = report.answers.find((answer) => answer.id === 'commands');
    expect(commands?.evidence.some((item) => item.value.includes('show no committed change'))).toBe(true);
    expect(commands?.evidence.some((item) => item.value.includes('changed somewhere in the transaction'))).toBe(false);
  });

  test('does not treat &mut as a committed write on a failed transaction', () => {
    const result = moveCallFixture({
      inputs: [
        { $kind: 'Object', Object: { $kind: 'SharedObject', SharedObject: { objectId: sharedId, initialSharedVersion: '1', mutable: true } } },
        { $kind: 'Object', Object: { $kind: 'SharedObject', SharedObject: { objectId: immutableId, initialSharedVersion: '1', mutable: false } } },
      ],
      arguments: [{ $kind: 'Input', Input: 0 }, { $kind: 'Input', Input: 1 }],
      functionName: 'tick',
      changedObjects: [mutatedChange(sharedId)],
      success: false,
    });
    const report = explainTransaction(normalizeTransaction(result, signatures));
    const commands = report.answers.find((answer) => answer.id === 'commands');
    expect(report.status).toBe('failure');
    expect(commands?.answer).toContain('did not commit');
    expect(commands?.evidence.some((item) => item.value.includes('did not commit application writes'))).toBe(true);
    expect(commands?.evidence.some((item) => item.value.includes('changed somewhere in the transaction'))).toBe(false);
  });

  test('does not invent a write when &mut is not tied to a known object id', () => {
    const result = moveCallFixture({
      inputs: [{ $kind: 'Pure', Pure: { bytes: 'AQID' } }],
      arguments: [{ $kind: 'Input', Input: 0 }, { $kind: 'Input', Input: 1 }],
      functionName: 'tick',
    });
    const report = explainTransaction(normalizeTransaction(result, signatures));
    const commands = report.answers.find((answer) => answer.id === 'commands');
    expect(commands?.evidence.some((item) => item.value.includes('not tied to a known object id'))).toBe(true);
    expect(commands?.evidence.some((item) => item.value.includes('changed somewhere in the transaction'))).toBe(false);
  });
});
