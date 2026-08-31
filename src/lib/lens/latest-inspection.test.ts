import { describe, expect, test } from 'bun:test';
import { LatestInspection } from './latest-inspection';

describe('LatestInspection', () => {
  test('aborts the previous inspection and prevents its result from rendering', () => {
    const inspections = new LatestInspection();
    const first = inspections.start();
    const second = inspections.start();
    const rendered: string[] = [];

    expect(first.signal.aborted).toBe(true);
    expect(inspections.commit(first, () => rendered.push('first'))).toBe(false);
    expect(inspections.commit(second, () => rendered.push('second'))).toBe(true);
    expect(rendered).toEqual(['second']);
  });

  test('prevents a cancelled inspection from rendering', () => {
    const inspections = new LatestInspection();
    const request = inspections.start();

    inspections.cancel();

    expect(request.signal.aborted).toBe(true);
    expect(inspections.isCurrent(request)).toBe(false);
  });
});
