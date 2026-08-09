export type RangeKey = "today" | "week" | "month" | "year" | "all" | "custom";

export function parseDate(value: string): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function rangeBounds(
  key: RangeKey,
  from?: string,
  to?: string,
): { start: Date | null; end: Date | null } {
  const now = new Date();
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  switch (key) {
    case "today":
      return { start: startOfDay(now), end: null };
    case "week": {
      const s = startOfDay(now);
      s.setDate(s.getDate() - 6);
      return { start: s, end: null };
    }
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: null };
    case "year":
      return { start: new Date(now.getFullYear(), 0, 1), end: null };
    case "custom": {
      const s = from ? new Date(from) : null;
      const e = to ? new Date(`${to}T23:59:59`) : null;
      return { start: s && !Number.isNaN(s.getTime()) ? s : null, end: e && !Number.isNaN(e.getTime()) ? e : null };
    }
    default:
      return { start: null, end: null };
  }
}

export function inRange(value: string, key: RangeKey, from?: string, to?: string): boolean {
  if (key === "all") return true;
  const d = parseDate(value);
  if (!d) return true;
  const { start, end } = rangeBounds(key, from, to);
  if (start && d < start) return false;
  if (end && d > end) return false;
  return true;
}

export function fmtDate(value: string, lang: string): string {
  const d = parseDate(value);
  if (!d) return value || "—";
  return d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function fmtTime(value: string, lang: string): string {
  const d = parseDate(value);
  if (!d) return value || "—";
  return d.toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtMoney(value: number, lang: string): string {
  const num = Number(value || 0).toLocaleString(lang === "ar" ? "ar-EG" : "en-US", {
    maximumFractionDigits: 2,
  });
  return lang === "ar" ? `${num} ج.م` : `EGP ${num}`;
}