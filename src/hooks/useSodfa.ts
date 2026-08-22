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

  // NEW
  products: ["products"] as const,

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
   REFRESH ALL
   ============================================================ */

/**
 * Every mutation refreshes all connected views
 * so no page shows stale data.
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

      // NEW
      qc.invalidateQueries({
        queryKey: keys.products,
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
  const refresh =
    useRefreshAll();

  return useMutation({
    mutationFn: fn,

    onSuccess: () => {
      void refresh();
    },
  });
}