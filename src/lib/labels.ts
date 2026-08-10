/** Printable barcode label sizes (barcode only — no text or branding). */
export interface LabelSize {
  key: LabelSizeKey;
  label: string;
  width: number;
  height: number;
}

export type LabelSizeKey = "40x30" | "50x30" | "58x40" | "80x50";

export const LABEL_SIZES: readonly LabelSize[] = [
  { key: "40x30", label: "40 × 30 mm", width: 40, height: 30 },
  { key: "50x30", label: "50 × 30 mm", width: 50, height: 30 },
  { key: "58x40", label: "58 × 40 mm", width: 58, height: 40 },
  { key: "80x50", label: "80 × 50 mm", width: 80, height: 50 },
] as const;

const KEY = "sodfa_label_size";

export function getLabelSize(): LabelSizeKey {
  if (typeof window === "undefined") return "50x30";
  try {
    const v = window.localStorage.getItem(KEY);
    return LABEL_SIZES.some((s) => s.key === v) ? (v as LabelSizeKey) : "50x30";
  } catch {
    return "50x30";
  }
}

export function setLabelSize(key: LabelSizeKey): void {
  try {
    window.localStorage.setItem(KEY, key);
  } catch {
    /* ignore */
  }
}

export function findLabelSize(key: LabelSizeKey): LabelSize {
  return LABEL_SIZES.find((s) => s.key === key) ?? LABEL_SIZES[1]!;
}