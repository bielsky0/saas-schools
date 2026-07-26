export interface CsvRow {
  email: string;
  parentName?: string;
  phone?: string;
  childName: string;
  age?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  healthNotes?: string;
}

export interface CsvImportError {
  row: number;
  email: string;
  reason: string;
}

export interface CsvImportReport {
  imported: number;
  failed: CsvImportError[];
  total: number;
}

const REQUIRED_HEADERS = ["email", "childName"] as const;

const OPTIONAL_HEADERS = [
  "parentName",
  "phone",
  "age",
  "emergencyContactName",
  "emergencyContactPhone",
  "healthNotes",
] as const;

const ALL_HEADERS = [...REQUIRED_HEADERS, ...OPTIONAL_HEADERS];

function normalizeHeader(h: string): string {
  const trimmed = h.trim();
  if (trimmed === "child_name" || trimmed === "child name") return "childName";
  if (trimmed === "parent_name" || trimmed === "parent name") return "parentName";
  if (trimmed === "emergency_contact_name" || trimmed === "emergency contact name")
    return "emergencyContactName";
  if (trimmed === "emergency_contact_phone" || trimmed === "emergency contact phone")
    return "emergencyContactPhone";
  if (trimmed === "health_notes" || trimmed === "health notes") return "healthNotes";
  return trimmed;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

function colVal(values: string[], colIndex: Record<string, number | undefined>, key: string): string {
  const idx = colIndex[key];
  if (idx === undefined) return "";
  return values[idx] ?? "";
}

export interface CsvRowResult {
  row: CsvRow;
  rowNumber: number;
}

export function parseCsv(text: string): { rows: CsvRowResult[]; headerErrors: string[]; rowErrors: CsvImportError[] } {
  const headerErrors: string[] = [];
  const rowErrors: CsvImportError[] = [];
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    headerErrors.push("csv_empty");
    return { rows: [], headerErrors, rowErrors: [] };
  }

  const headerLine = lines[0]!;
  const rawHeaders = parseCsvLine(headerLine);
  const headers = rawHeaders.map(normalizeHeader);

  const missingRequired = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
  if (missingRequired.length > 0) {
    headerErrors.push(`missing_required_columns: ${missingRequired.join(", ")}`);
    return { rows: [], headerErrors, rowErrors: [] };
  }

  const unknownHeaders = headers.filter(
    (h) => !ALL_HEADERS.includes(h as (typeof ALL_HEADERS)[number]) && h.length > 0,
  );
  if (unknownHeaders.length > 0) {
    headerErrors.push(`unknown_columns: ${unknownHeaders.join(", ")}`);
  }

  const colIndex: Record<string, number | undefined> = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (h !== undefined && ALL_HEADERS.includes(h as (typeof ALL_HEADERS)[number])) {
      colIndex[h] = i;
    }
  }

  const rows: CsvRowResult[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line === undefined) continue;
    const values = parseCsvLine(line);

    const email = colVal(values, colIndex, "email");
    const childName = colVal(values, colIndex, "childName");

    if (!email || !childName) {
      if (email || childName) {
        rowErrors.push({ row: i + 1, email: email || "(missing)", reason: "missing_required_field" });
      }
      continue;
    }

    const row: CsvRow = { email, childName };

    const age = colVal(values, colIndex, "age");
    if (age.length > 0) row.age = age;
    const parentName = colVal(values, colIndex, "parentName");
    if (parentName.length > 0) row.parentName = parentName;
    const phone = colVal(values, colIndex, "phone");
    if (phone.length > 0) row.phone = phone;
    const emergencyContactName = colVal(values, colIndex, "emergencyContactName");
    if (emergencyContactName.length > 0) row.emergencyContactName = emergencyContactName;
    const emergencyContactPhone = colVal(values, colIndex, "emergencyContactPhone");
    if (emergencyContactPhone.length > 0) row.emergencyContactPhone = emergencyContactPhone;
    const healthNotes = colVal(values, colIndex, "healthNotes");
    if (healthNotes.length > 0) row.healthNotes = healthNotes;

    rows.push({ row, rowNumber: i + 1 });
  }

  return { rows, headerErrors, rowErrors };
}

export function validateRow(row: CsvRow): string | null {
  if (!row.email.includes("@")) {
    return "invalid_email";
  }
  if (row.childName.length < 1) {
    return "empty_child_name";
  }
  return null;
}
