import { needsOrderConfirmation, scopedCount } from "./company-dashboard.ts";
import type { CompanyProject, CompanySection } from "./company-navigation";

type Count = { brand: string; count: number };
type Availability = { summary: boolean; orders: boolean; customers: boolean; shipments: boolean };
type Snapshot = {
  catalog: { productsAvailable: boolean; draftCounts: Count[] | null };
  operations: {
    available: Availability;
    summary: (Count & { status: string })[];
    shipments: (Count & { state: string })[];
    orders: { brand: string }[];
  };
  sodfa: { connected: boolean };
};
type Queue = "confirm" | "shipping-review" | "drafts";
type Level = "attention" | "unavailable" | "clear";
type ReviewFinding = {
  role: string;
  label: string;
  level: Level;
  section: CompanySection;
  queue?: Queue;
  count?: number;
};

export async function runCompanyReview(snapshot: Snapshot, project: CompanyProject) {
  const brand = project === "homey" || project === "sodfa" ? project : "all";
  const { operations, catalog, sodfa } = snapshot;
  const canReviewCatalog = project !== "orders";
  const roles = [
    {
      role: "مراجع الأرقام",
      section: "orders" as const,
      run(): ReviewFinding {
        const total = scopedCount(operations.summary, brand, operations.available.summary);
        const loaded = operations.orders.filter(
          (row) => brand === "all" || row.brand === brand,
        ).length;
        if (total === null || !operations.available.orders)
          return {
            role: this.role,
            section: this.section,
            level: "unavailable",
            label: "قراءة إجمالي الطلبات أو القائمة غير متاحة.",
          };
        return {
          role: this.role,
          section: this.section,
          level: loaded > total ? "attention" : "clear",
          label:
            loaded > total
              ? "عدد الطلبات المحمّلة أكبر من الإجمالي المسجل. راجع القراءتين."
              : "إجمالي الطلبات المقروء من مدير الطلبات.",
          count: total,
        };
      },
    },
    {
      role: "مراجع مصادر البيانات",
      section: "settings" as const,
      run(): ReviewFinding {
        const missing = [
          ...(!operations.available.summary || !operations.available.orders ? ["الطلبات"] : []),
          ...(!operations.available.shipments ? ["الشحن"] : []),
          ...(canReviewCatalog && !catalog.productsAvailable ? ["الكتالوج"] : []),
          ...((project === "all" || project === "sodfa") && !sodfa.connected ? ["مخزون صدفة"] : []),
        ];
        return {
          role: this.role,
          section: this.section,
          level: missing.length ? "unavailable" : "clear",
          label: missing.length
            ? "تعذرت قراءة: " + missing.join("، ")
            : "مصادر البيانات المطلوبة وصلت في آخر قراءة.",
        };
      },
    },
    {
      role: "مراجع الطلبات والشحن",
      section: "orders" as const,
      run(): ReviewFinding[] {
        const orders = scopedCount(operations.summary, brand, operations.available.summary, (row) =>
          needsOrderConfirmation(row.status),
        );
        const shipments = scopedCount(
          operations.shipments,
          brand,
          operations.available.shipments,
          (row) => row.state === "review",
        );
        return [
          finding(this.role, "طلبات محتاجة تأكيد", "orders", "confirm", orders),
          finding(this.role, "شحنات تحتاج مراجعة", "shipping", "shipping-review", shipments),
        ];
      },
    },
    ...(canReviewCatalog
      ? [
          {
            role: "مراجع الكتالوج",
            section: "products" as const,
            run(): ReviewFinding {
              return finding(
                this.role,
                "مسودات كتالوج محفوظة",
                "products",
                "drafts",
                scopedCount(catalog.draftCounts ?? undefined, brand, catalog.draftCounts !== null),
              );
            },
          },
        ]
      : []),
  ];

  const results = await Promise.allSettled(
    roles.map((role) => Promise.resolve().then(() => role.run())),
  );
  const findings = results.flatMap<ReviewFinding>((result, index) =>
    result.status === "fulfilled"
      ? result.value
      : {
          role: roles[index]!.role,
          section: roles[index]!.section,
          label: "تعذرت المراجعة في الجولة الحالية.",
          level: "unavailable",
        },
  );
  const priority: Record<Level, number> = { attention: 0, unavailable: 1, clear: 2 };
  return findings.sort((a, b) => priority[a.level] - priority[b.level]);
}

function finding(
  role: string,
  label: string,
  section: CompanySection,
  queue: Queue,
  count: number | null,
): ReviewFinding {
  if (count === null)
    return { role, label: label + " — البيانات غير متاحة", section, queue, level: "unavailable" };
  return { role, label, section, queue, count, level: count > 0 ? "attention" : "clear" };
}
