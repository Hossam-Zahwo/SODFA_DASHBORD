export const projects = ["all", "homey", "sodfa_web", "sodfa", "orders"] as const;
export const sections = [
  "dashboard",
  "store-admin",
  "orders",
  "products",
  "categories",
  "shipping",
  "customers",
  "finance",
  "settings",
] as const;
export type CompanyProject = (typeof projects)[number];
export type CompanySection = (typeof sections)[number];

export function companySections(
  project: CompanyProject,
  viewer = false,
): readonly CompanySection[] {
  if (project === "sodfa_web") return ["dashboard", "products", "settings"];
  if (project === "orders") return ["dashboard", "orders", "shipping", "customers", "settings"];
  if (project === "homey") return sections.filter((section) => section !== "finance");
  return sections.filter((section) => section !== "categories" && section !== "store-admin" && (!viewer || section !== "finance"));
}

export function companyLocation(search: Record<string, unknown>): {
  project?: CompanyProject;
  section?: CompanySection;
  queue?: "confirm" | "shipping-review" | "drafts";
} {
  const project = projects.find((value) => value === search["project"]);
  const section = companySections(project ?? "all").find((value) => value === search["section"]);
  const value = search["queue"];
  const queue =
    (section === "orders" && value === "confirm") ||
    (section === "shipping" && value === "shipping-review") ||
    (section === "products" && value === "drafts")
      ? value
      : undefined;
  return { ...(project ? { project } : {}), ...(section ? { section } : {}), ...(queue ? { queue } : {}) };
}

export const ordersManagerUrl = "https://homey-sodfa-orders-manager.vercel.app";

const homeyAdmin = "https://www.homeyegypt.com/admin";
const homeySections = { categories: "categories", products: "products", orders: "orders", customers: "customers" } as const;

export function homeyAdminUrl(section: CompanySection) {
  if (section === "dashboard" || section === "store-admin") return homeyAdmin;
  if (section === "settings") return `${homeyAdmin}/settings`;
  if (section === "categories" || section === "products" || section === "orders" || section === "customers") {
    return `${homeyAdmin}/${homeySections[section]}`;
  }
  return null;
}

export function orderWaybillUrl(id: string | null | undefined) {
  return id && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id)
    ? `${ordersManagerUrl}/waybills/${id}`
    : null;
}
