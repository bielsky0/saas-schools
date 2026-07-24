/**
 * Database error helpers — reużywalne narzędzia do obsługi błędów Postgresa.
 *
 * Używane wszędzie tam, gdzie aplikacja musi rozpoznać konkretny kod błędu
 * (np. unique_violation dla duplikatów) i przemapować go na domenowy wyjątek.
 */

/**
 * Sprawdza, czy błąd (catch) jest postgresowym unique_violation (23505).
 * Opcjonalnie filtruje po nazwie constraintu, jeśli podana.
 */
export function isPgUniqueViolation(
  error: unknown,
  constraintName?: string,
): boolean {
  const err = error as { code?: string; constraint?: string } | null;
  if (!err?.code) return false;
  if (err.code !== "23505") return false;
  if (constraintName && err.constraint !== constraintName) return false;
  return true;
}
