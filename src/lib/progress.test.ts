import { describe, expect, test } from 'bun:test';
import { parseCompletedLessons } from './progress';

describe('journey progress storage', () => {
  test('returns no progress for missing, malformed, or non-array storage', () => {
    expect(parseCompletedLessons(null)).toEqual([]);
    expect(parseCompletedLessons('{')).toEqual([]);
    expect(parseCompletedLessons('{"lesson":"objects/identity-and-state"}')).toEqual([]);
  });

  test('keeps unique lesson ids and drops invalid entries', () => {
    expect(parseCompletedLessons(JSON.stringify([
      'objects/identity-and-state',
      3,
      '',
      'objects/identity-and-state',
      'transactions/read-the-ptb',
    ]))).toEqual([
      'objects/identity-and-state',
      'transactions/read-the-ptb',
    ]);
  });
});
