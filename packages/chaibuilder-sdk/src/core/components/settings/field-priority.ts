export interface FieldPriority {
  /** Fields kept visible by default (required or already filled). */
  visible: string[];
  /** Empty, optional fields hidden behind the "More fields" toggle. */
  extra: string[];
}

const isEmptyValue = (value: unknown): boolean =>
  value == null ||
  value === "" ||
  (Array.isArray(value) && value.length === 0) ||
  (typeof value === "object" && Object.keys(value as Record<string, unknown>).length === 0);

/**
 * Splits the block's form fields into visible and "more" buckets. Fields that
 * are required or already carry a value stay visible; empty optional fields go
 * behind the "More fields" toggle so the Content tab starts clean.
 */
export const getFieldPriority = (
  properties: Record<string, unknown> | undefined,
  formData: Record<string, unknown> | undefined,
  required: string[] = [],
): FieldPriority => {
  const visible: string[] = [];
  const extra: string[] = [];
  for (const key of Object.keys(properties ?? {})) {
    if (required.includes(key) || !isEmptyValue(formData?.[key])) {
      visible.push(key);
    } else {
      extra.push(key);
    }
  }
  return { visible, extra };
};

/** Returns a copy of the uiSchema with the given fields forced hidden. */
export const hideFieldsInUiSchema = (
  uiSchema: Record<string, any> | undefined,
  fields: string[],
): Record<string, any> => {
  const next = { ...(uiSchema ?? {}) };
  for (const field of fields) {
    next[field] = { ...(next[field] ?? {}), "ui:hidden": true };
  }
  return next;
};