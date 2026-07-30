export function validateBlockAccess(
  _blocks: unknown[],
  _grantedKeys: Set<string>,
): { valid: boolean; errors: string[] } {
  return { valid: true, errors: [] };
}
