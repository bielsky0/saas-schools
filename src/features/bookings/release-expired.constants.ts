export const PENDING_PAYMENT_TTL_MS = 15 * 60 * 1000;

export function toBatchMap(
  rows: { id: string; organizationId: string }[],
): Map<string, string[]> {
  const byOrganization = new Map<string, string[]>();
  for (const row of rows) {
    const ids = byOrganization.get(row.organizationId) ?? [];
    ids.push(row.id);
    byOrganization.set(row.organizationId, ids);
  }
  return byOrganization;
}
