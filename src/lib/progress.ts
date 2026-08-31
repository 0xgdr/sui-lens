export function parseCompletedLessons(raw: string | null): string[] {
  if (!raw) return [];

  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];

    return [...new Set(value.filter((item): item is string => (
      typeof item === 'string' && item.trim().length > 0
    )))];
  } catch {
    return [];
  }
}
