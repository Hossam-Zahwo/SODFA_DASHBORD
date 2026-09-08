import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api } from "@/lib/api";

/* ============================================================
   QUERY KEYS
   ============================================================ */

export const keys = {
  inventory: ["inventory"] as const,
  warehouses: ["warehouses"] as const,
  sales: ["sales"] as const,
  returns: ["returns"] as const,
  damaged: ["damaged"] as const,
  products: ["products"] as const,
  categories: ["categories"] as const,
  connection: ["connection"] as const,
};

/* ============================================================
   COMMON QUERY OPTIONS
   ============================================================ */

const common = {
  staleTime: 15_000,
  retry: 1,
};

/* ============================================================
   INVENTORY
   ============================================================ */

export const useInventory = () =>
  useQuery({
    queryKey: keys.inventory,
    queryFn: api.inventory,
    ...common,
  });

/* ============================================================
   WAREHOUSES
   ============================================================ */

export const useWarehouses = () =>
  useQuery({
    queryKey: keys.warehouses,
    queryFn: api.warehouses,
    ...common,
  });

/* ============================================================
   SALES
   ============================================================ */

export const useSales = () =>
  useQuery({
    queryKey: keys.sales,
    queryFn: api.sales,
    ...common,
  });

/* ============================================================
   RETURNS
   ============================================================ */

export const useReturns = () =>
  useQuery({
    queryKey: keys.returns,
    queryFn: api.returns,
    ...common,
  });

/* ============================================================
   DAMAGED RETURNS
   ============================================================ */

export const useDamagedReturns = () =>
  useQuery({
    queryKey: keys.damaged,
    queryFn: api.damagedReturns,
    ...common,
  });

/* ============================================================
   PRODUCTS
   ============================================================ */

export const useProducts = () =>
  useQuery({
    queryKey: keys.products,
    queryFn: api.products,
    ...common,
  });

/* ============================================================
   CATEGORIES
   ============================================================ */

export const useCategories = () =>
  useQuery({
    queryKey: keys.categories,
    queryFn: api.categories,
    ...common,
  });

/* ============================================================
   REFRESH ALL
   ============================================================ */

/**
 * Refresh every connected query after a successful mutation.
 *
 * Important:
 * We return the Promise so mutations can wait until
 * the connected queries have been invalidated/refetched.
 */

export function useRefreshAll() {
  const qc = useQueryClient();

  return () =>
    Promise.all([
      qc.invalidateQueries({
        queryKey: keys.inventory,
      }),

      qc.invalidateQueries({
        queryKey: keys.warehouses,
      }),

      qc.invalidateQueries({
        queryKey: keys.sales,
      }),

      qc.invalidateQueries({
        queryKey: keys.returns,
      }),

      qc.invalidateQueries({
        queryKey: keys.damaged,
      }),

      qc.invalidateQueries({
        queryKey: keys.products,
      }),

      qc.invalidateQueries({
        queryKey: keys.categories,
      }),
    ]);
}

/* ============================================================
   API MUTATION
   ============================================================ */

export function useApiMutation<
  TArgs,
  TResult,
>(
  fn: (
    args: TArgs,
  ) => Promise<TResult>,
) {
  const refresh = useRefreshAll();

  return useMutation({
    mutationFn: fn,

    /*
     * IMPORTANT:
     * Do NOT use `void refresh()` here.
     *
     * Returning/awaiting the Promise makes React Query wait
     * for the refresh before considering the mutation completely
     * finished.
     */
    onSuccess: async () => {
      await refresh();
    },
  });
}