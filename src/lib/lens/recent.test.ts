import { describe, expect, test } from 'bun:test';
import { parseRecentInspections } from './recent';

const valid = {
  digest: '11111111111111111111111111111111',
  summary: 'A readable transaction summary.',
  inspectedAt: '2026-08-31T08:00:00.000Z',
};

describe('recent Lens inspections', () => {
  test('returns no entries for missing, malformed, or non-array storage', () => {
    expect(parseRecentInspections(null)).toEqual([]);
    expect(parseRecentInspections('{')).toEqual([]);
    expect(parseRecentInspections(JSON.stringify({ item: valid }))).toEqual([]);
  });

  test('keeps only complete entries with a valid transaction digest and date', () => {
    const entries = parseRecentInspections(JSON.stringify([
      valid,
      { ...valid, digest: 'not-a-digest' },
      { ...valid, summary: '   ' },
      { ...valid, inspectedAt: 'not-a-date' },
      null,
    ]));

    expect(entries).toEqual([valid]);
  });
});
