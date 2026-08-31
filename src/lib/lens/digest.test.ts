import { describe, expect, test } from 'bun:test';
import { isTransactionDigest } from './digest';

describe('isTransactionDigest', () => {
  test('requires Base58 that decodes to exactly 32 bytes', () => {
    expect(isTransactionDigest('GWJNiU5UHbcpd8UNgqQkiANG3jY8pjKHXa9AhHx68xzX')).toBe(true);
    expect(isTransactionDigest('11111111111111111111111111111111')).toBe(true);
    expect(isTransactionDigest('11111111111111111111111111111111111111111111')).toBe(false);
    expect(isTransactionDigest('not-a-digest')).toBe(false);
  });
});
