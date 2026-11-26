import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireCompanyAccess } from "./company-access.server";

const catalogSchema = z.object({
  snapshot_at: z.iso.datetime({ offset: true }),
  categories: z.array(
    z.object({
      id: z.string().uuid(),
      name_ar: z.string(),
      is_active: z.boolean(),
    }),
  ),
  products: z.array(
    z.object({
      id: z.string().uuid(),
      title_ar: z.string(),
      status: z.string(),
      categories: z.array(z.string()),
    }),
  ),
});

export const getHomeyCategories = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(16).max(8192) }))
  .handler(async ({ data }) => {
    await requireCompanyAccess(data.token, "homey", "read");

    const response = await fetch("https://www.homeyegypt.com/emergency/catalog-full.json", {
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("HOMEY_CATALOG_UNAVAILABLE");
    const snapshot = catalogSchema.parse(await response.json());
    const productsByCategory = new Map<string, { id: string; title: string }[]>();
    for (const product of snapshot.products) {
      if (product.status !== "published") continue;
      for (const category of new Set(product.categories)) {
        const entries = productsByCategory.get(category) ?? [];
        entries.push({ id: product.id, title: product.title_ar });
        productsByCategory.set(category, entries);
      }
    }

    return {
      snapshotAt: snapshot.snapshot_at,
      categories: snapshot.categories
        .filter((category) => category.is_active)
        .map((category) => ({
          id: category.id,
          name: category.name_ar,
          products: productsByCategory.get(category.id) ?? [],
        })),
    };
  });
