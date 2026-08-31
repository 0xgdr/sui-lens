import { SuiGraphQLClient } from '@mysten/sui/graphql';
import type { SuiClientTypes } from '@mysten/sui/client';
import {
  moveFunctionKey,
  type MoveFunctionTarget,
  type MoveSignatureLookup,
} from './move-signature';

export const mainnetGraphqlUrl = 'https://graphql.mainnet.sui.io/graphql';

export const transactionInclude = {
  effects: true,
  transaction: true,
  balanceChanges: true,
  objectTypes: true,
} as const;

export type LiveTransactionResult = SuiClientTypes.TransactionResult<typeof transactionInclude>;

const client = new SuiGraphQLClient({
  network: 'mainnet',
  url: mainnetGraphqlUrl,
});

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

export async function getMainnetTransaction(
  digest: string,
  signal?: AbortSignal,
): Promise<LiveTransactionResult> {
  return client.getTransaction({
    digest,
    include: transactionInclude,
    signal,
  });
}

export async function getMoveFunction(
  target: MoveFunctionTarget,
  signal?: AbortSignal,
): Promise<SuiClientTypes.FunctionResponse | null> {
  try {
    const response = await client.getMoveFunction({
      packageId: target.package,
      moduleName: target.module,
      name: target.function,
      signal,
    });
    return response.function;
  } catch (reason) {
    if (signal?.aborted) throw reason;
    return null;
  }
}

export function collectMoveCallTargets(result: LiveTransactionResult): MoveFunctionTarget[] {
  const transaction = result.Transaction ?? result.FailedTransaction;
  const commands = transaction.transaction?.commands ?? [];
  const targets = new Map<string, MoveFunctionTarget>();

  for (const command of commands) {
    if (!isRecord(command) || command.$kind !== 'MoveCall' || !isRecord(command.MoveCall)) continue;
    const payload = command.MoveCall;
    if (typeof payload.package !== 'string' || typeof payload.module !== 'string' || typeof payload.function !== 'string') {
      continue;
    }
    const target = { package: payload.package, module: payload.module, function: payload.function };
    targets.set(moveFunctionKey(target), target);
  }

  return [...targets.values()];
}

export async function resolveMoveFunctionSignatures(
  result: LiveTransactionResult,
  signal?: AbortSignal,
): Promise<MoveSignatureLookup> {
  const entries = await Promise.all(
    collectMoveCallTargets(result).map(async (target) => [moveFunctionKey(target), await getMoveFunction(target, signal)] as const),
  );
  return new Map(entries);
}
