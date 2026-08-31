import { isValidTransactionDigest } from '@mysten/sui/utils';

export function isTransactionDigest(value: string): boolean {
  return isValidTransactionDigest(value);
}
