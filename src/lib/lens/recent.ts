import { isTransactionDigest } from './digest';

export interface RecentInspection {
  digest: string;
  summary: string;
  inspectedAt: string;
}

export function parseRecentInspections(raw: string | null): RecentInspection[] {
  if (!raw) return [];

  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];

    return value.filter((item): item is RecentInspection => Boolean(
      item
      && typeof item === 'object'
      && 'digest' in item
      && typeof item.digest === 'string'
      && isTransactionDigest(item.digest)
      && 'summary' in item
      && typeof item.summary === 'string'
      && item.summary.trim().length > 0
      && 'inspectedAt' in item
      && typeof item.inspectedAt === 'string'
      && !Number.isNaN(Date.parse(item.inspectedAt)),
    ));
  } catch {
    return [];
  }
}
