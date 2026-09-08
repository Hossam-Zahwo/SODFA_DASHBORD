import * as XLSX from "xlsx";

export interface ImportedCategoryRow {
  name: string;
  name_en: string;
  keywords_ar: string[];
  keywords_en: string[];
}

const REQUIRED_HEADERS = [
  "Category Name",
  "English Category",
  "Arabic Keywords",
  "English Keywords",
] as const;

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function splitKeywords(value: unknown): string[] {
  return clean(value)
    .split(/[،,;؛\n|]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, all) => all.findIndex((x) => x.toLowerCase() === item.toLowerCase()) === index);
}

function findHeader(headers: string[], wanted: string): string | undefined {
  const normalized = wanted.trim().toLowerCase();
  return headers.find((header) => header.trim().toLowerCase() === normalized);
}

export async function parseCategoryWorkbook(file: File): Promise<ImportedCategoryRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!firstSheet) return [];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const headerRow = (matrix[0] ?? []).map(clean);
  const headerMap = new Map<string, number>();

  for (const wanted of REQUIRED_HEADERS) {
    const actual = findHeader(headerRow, wanted);
    if (!actual) {
      throw new Error(`MISSING_COLUMN:${wanted}`);
    }
    headerMap.set(wanted, headerRow.indexOf(actual));
  }

  const seen = new Set<string>();
  const rows: ImportedCategoryRow[] = [];

  for (let i = 1; i < matrix.length; i += 1) {
    const row = matrix[i] ?? [];
    const name = clean(row[headerMap.get("Category Name")!]);
    const nameEn = clean(row[headerMap.get("English Category")!]);
    const keywordsAr = splitKeywords(row[headerMap.get("Arabic Keywords")!]);
    const keywordsEn = splitKeywords(row[headerMap.get("English Keywords")!]);

    if (!name && !nameEn && !keywordsAr.length && !keywordsEn.length) continue;
    if (!name) continue;

    const key = name.toLocaleLowerCase("ar-EG");
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      name,
      name_en: nameEn,
      keywords_ar: keywordsAr,
      keywords_en: keywordsEn,
    });
  }

  return rows;
}
