export type SourceUpdateResult = { id: string; error: Error | null };

// A failed row must not hide already saved changes or skip the remaining rows.
export async function updateSelectedSources(
  ids: string[],
  enabled: boolean,
  update: (id: string, body: { enabled: boolean }) => Promise<unknown>,
): Promise<SourceUpdateResult[]> {
  const results: SourceUpdateResult[] = [];
  for (const id of [...new Set(ids)]) {
    try {
      await update(id, { enabled });
      results.push({ id, error: null });
    } catch (error) {
      results.push({ id, error: error instanceof Error ? error : new Error(String(error)) });
    }
  }
  return results;
}
