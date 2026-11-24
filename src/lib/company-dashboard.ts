const orderLabels: Readonly<Record<string, string>> = {
  new: "جديد",
  contacted: "تم التواصل",
  confirmed: "مؤكد",
  preparing: "قيد التجهيز",
  shipped: "مع شركة الشحن",
  delivered: "تم التسليم للعميل",
  cancelled: "ملغي",
  returned: "مرتجع",
  postponed: "مؤجل",
  refused: "رفض الاستلام",
};

export function orderStatusLabel(status: string) {
  return Object.hasOwn(orderLabels, status) ? (orderLabels[status] ?? status) : status;
}

type Count = { brand: string; count: number };

export function scopedCount<T extends Count>(
  rows: readonly T[] | undefined,
  brand: string,
  available: boolean | undefined,
  include: (row: T) => boolean = () => true,
): number | null {
  if (!available || !rows) return null;
  const scoped = rows.filter((row) => (brand === "all" || row.brand === brand) && include(row));
  return scoped.reduce((total, row) => total + row.count, 0);
}
