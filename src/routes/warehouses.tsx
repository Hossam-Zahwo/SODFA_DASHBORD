import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  Package,
  Plus,
  Trash2,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Blocks } from "@/components/blocks-export";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ConfirmDialog";

import {
  useApiMutation,
  useInventory,
  useWarehouses,
} from "@/hooks/useSodfa";

import { api, type Warehouse } from "@/lib/api";
import { errorMessage, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/warehouses")({
  head: () => ({
    meta: [
      {
        title: "Warehouses — SODFA صدفة",
      },
      {
        name: "description",
        content:
          "Create, rename and remove SODFA warehouses dynamically.",
      },
      {
        property: "og:title",
        content: "Warehouses — SODFA صدفة",
      },
      {
        property: "og:description",
        content: "Dynamic warehouse management.",
      },
    ],
  }),

  component: WarehousesPage,
});

function WarehousesPage() {
  const { t, lang } = useI18n();

  const warehouses = useWarehouses();
  const inventory = useInventory();

  const [name, setName] = useState("");
  const [toDelete, setToDelete] =
    useState<Warehouse | null>(null);

  const create = useApiMutation(
    (n: string) => api.saveWarehouse(n),
  );

  const rename = useApiMutation(
    (p: { id: string; name: string }) =>
      api.updateWarehouse(p.id, p.name),
  );

  const remove = useApiMutation(
    (id: string) => api.deleteWarehouse(id),
  );

  /*
   * المنتجات الموجودة داخل المخزن
   */
  const warehouseProducts = (id: string) =>
    (inventory.data ?? []).filter(
      (product) => product.warehouse === id,
    );

  /*
   * عدد المنتجات المختلفة
   */
  const productCount = (id: string) =>
    warehouseProducts(id).length;

  /*
   * إجمالي الكمية الموجودة في المخزن
   */
  const stockCount = (id: string) =>
    warehouseProducts(id).reduce(
      (total, product) =>
        total + Number(product.remaining_qty || 0),
      0,
    );

  /*
   * التأكد من عدم تكرار اسم المخزن
   */
  const warehouseNameExists = (
    value: string,
    exceptId?: string,
  ) => {
    const normalized = value
      .trim()
      .toLowerCase();

    return (warehouses.data ?? []).some(
      (warehouse) =>
        warehouse.warehouse_id !== exceptId &&
        warehouse.warehouse_name
          .trim()
          .toLowerCase() === normalized,
    );
  };

  const handleCreate = () => {
    const trimmed = name.trim();

    if (!trimmed) {
      toast.error(t("err_required"));
      return;
    }

    if (warehouseNameExists(trimmed)) {
      toast.error("اسم المخزن موجود بالفعل");
      return;
    }

    create.mutate(trimmed, {
      onSuccess: () => {
        toast.success(t("saved"));
        setName("");
      },

      onError: (error) => {
        toast.error(
          errorMessage(error, lang),
        );
      },
    });
  };

  const handleRename = (
    warehouse: Warehouse,
    value: string,
  ) => {
    const trimmed = value.trim();

    if (!trimmed) {
      toast.error(t("err_required"));
      return;
    }

    if (
      trimmed === warehouse.warehouse_name
    ) {
      return;
    }

    if (
      warehouseNameExists(
        trimmed,
        warehouse.warehouse_id,
      )
    ) {
      toast.error("اسم المخزن موجود بالفعل");
      return;
    }

    rename.mutate(
      {
        id: warehouse.warehouse_id,
        name: trimmed,
      },
      {
        onSuccess: () => {
          toast.success(t("saved"));
        },

        onError: (error) => {
          toast.error(
            errorMessage(error, lang),
          );
        },
      },
    );
  };

  const handleDelete = () => {
    if (!toDelete) {
      return;
    }

    const count =
      productCount(
        toDelete.warehouse_id,
      );

    if (count > 0) {
      toast.error(
        "لا يمكن حذف المخزن لأنه يحتوي على منتجات",
      );
      setToDelete(null);
      return;
    }

    remove.mutate(
      toDelete.warehouse_id,
      {
        onSuccess: () => {
          toast.success(t("deleted"));
          setToDelete(null);
        },

        onError: (error) => {
          toast.error(
            errorMessage(error, lang),
          );
        },
      },
    );
  };

  return (
    <AppShell title={t("warehouses")}>
      <div className="min-h-full space-y-6">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <Card
          className="
            relative overflow-hidden
            border-0
            bg-gradient-to-r
            from-[#7B2C8E]
            via-[#9B4BA8]
            to-[#C084CC]
            p-0
            shadow-lg
          "
        >
          <div className="absolute inset-0 bg-white/5" />

          <div className="relative p-5 sm:p-6">

            <div className="mb-5 flex items-center gap-3">
              <div
                className="
                  flex h-11 w-11 items-center justify-center
                  rounded-xl
                  bg-white/20
                  backdrop-blur-sm
                  ring-1 ring-white/30
                "
              >
                <WarehouseIcon className="h-5 w-5 text-white" />
              </div>

              <div>
                <h2 className="text-lg font-bold text-white">
                  {t("warehouses")}
                </h2>

                <p className="text-sm text-white/80">
                  إدارة المخازن وإضافة مخزن جديد
                </p>
              </div>
            </div>

            <div
              className="
                flex flex-col gap-3
                rounded-2xl
                border border-white/20
                bg-white/10
                p-3
                backdrop-blur-md
                sm:flex-row
                sm:items-center
              "
            >
              <Input
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreate();
                  }
                }}
                placeholder={t("warehouse_name")}
                className="
                  h-11
                  w-full
                  border-white/30
                  bg-white
                  text-black
                  placeholder:text-gray-500
                  shadow-sm
                  focus:border-[#C084CC]
                  focus:ring-2
                  focus:ring-[#C084CC]/30
                  sm:max-w-sm
                "
              />

              <Button
                disabled={create.isPending}
                onClick={handleCreate}
                className="
                  h-11
                  border
                  border-white/30
                  bg-white
                  px-5
                  font-semibold
                  text-[#7B2C8E]
                  shadow-sm
                  transition-all
                  hover:bg-[#F8ECFA]
                  hover:text-[#7B2C8E]
                  hover:shadow-md
                  sm:w-auto
                "
              >
                <Plus className="me-1 h-4 w-4" />

                {create.isPending
                  ? t("saving")
                  : t("add_warehouse")}
              </Button>
            </div>
          </div>
        </Card>

        {/* =====================================================
            WAREHOUSES
        ====================================================== */}

        {warehouses.isLoading ? (
          <Card className="border-[#C084CC]/30 bg-white p-6 shadow-sm">
            <Blocks.Loading label={t("loading")} />
          </Card>
        ) : warehouses.isError ? (
          <Card className="border-[#C084CC]/30 bg-white p-6 shadow-sm">
            <Blocks.Error
              label={errorMessage(
                warehouses.error,
                lang,
              )}
            />
          </Card>
        ) : (warehouses.data ?? []).length === 0 ? (
          <Card className="border-[#C084CC]/30 bg-white p-6 shadow-sm">
            <Blocks.Empty
              label={t("no_results")}
            />
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {(warehouses.data ?? []).map(
              (warehouse) => {
                const products =
                  productCount(
                    warehouse.warehouse_id,
                  );

                const stock =
                  stockCount(
                    warehouse.warehouse_id,
                  );

                return (
                  <Card
                    key={
                      warehouse.warehouse_id
                    }
                    className="
                      group
                      relative
                      overflow-hidden
                      border
                      border-[#C084CC]/40
                      bg-gradient-to-br
                      from-white
                      via-white
                      to-[#F8ECFA]
                      p-0
                      shadow-sm
                      transition-all
                      duration-300
                      hover:-translate-y-1
                      hover:border-[#9B4BA8]/70
                      hover:shadow-lg
                      hover:shadow-[#9B4BA8]/10
                    "
                  >

                    {/* TOP LINE */}

                    <div
                      className="
                        h-1
                        w-full
                        bg-gradient-to-r
                        from-[#7B2C8E]
                        via-[#9B4BA8]
                        to-[#C084CC]
                      "
                    />

                    <div className="space-y-4 p-5">

                      {/* HEADER */}

                      <div className="flex items-start gap-3">

                        <div
                          className="
                            flex h-11 w-11 shrink-0
                            items-center justify-center
                            rounded-xl
                            bg-gradient-to-br
                            from-[#7B2C8E]
                            to-[#C084CC]
                            shadow-sm
                            shadow-[#9B4BA8]/20
                          "
                        >
                          <WarehouseIcon
                            className="
                              h-5 w-5
                              text-white
                            "
                          />
                        </div>

                        <div className="min-w-0 flex-1">

                          <p
                            className="
                              mb-1
                              text-xs
                              font-medium
                              text-[#9B4BA8]
                            "
                          >
                            مستودع
                          </p>

                          <p
                            className="
                              truncate
                              text-base
                              font-bold
                              text-gray-900
                            "
                          >
                            {
                              warehouse.warehouse_name
                            }
                          </p>

                        </div>

                      </div>

                      {/* RENAME */}

                      <div className="space-y-2">

                        <label
                          className="
                            text-xs
                            font-semibold
                            text-gray-700
                          "
                        >
                          اسم المستودع
                        </label>

                        <Input
                          defaultValue={
                            warehouse.warehouse_name
                          }
                          disabled={
                            rename.isPending
                          }
                          onBlur={(e) => {
                            handleRename(
                              warehouse,
                              e.target.value,
                            );
                          }}
                          onKeyDown={(e) => {
                            if (
                              e.key === "Enter"
                            ) {
                              e.currentTarget.blur();
                            }
                          }}
                          className="
                            h-10
                            border
                            border-[#C084CC]/40
                            bg-white
                            text-gray-900
                            shadow-none
                            transition-all
                            focus:border-[#9B4BA8]
                            focus:ring-2
                            focus:ring-[#9B4BA8]/20
                          "
                        />

                      </div>

                      {/* STATS */}

                      <div className="grid grid-cols-2 gap-3">

                        <div
                          className="
                            flex
                            items-center
                            gap-3
                            rounded-xl
                            border
                            border-[#C084CC]/30
                            bg-[#F8ECFA]
                            p-3
                          "
                        >

                          <div
                            className="
                              flex
                              h-9
                              w-9
                              shrink-0
                              items-center
                              justify-center
                              rounded-lg
                              bg-white
                              shadow-sm
                            "
                          >
                            <Package
                              className="
                                h-4
                                w-4
                                text-[#7B2C8E]
                              "
                            />
                          </div>

                          <div className="min-w-0">

                            <p className="text-[10px] font-medium text-gray-500">
                              المنتجات
                            </p>

                            <p className="text-lg font-bold text-[#7B2C8E]">
                              {products}
                            </p>

                          </div>

                        </div>

                        <div
                          className="
                            rounded-xl
                            border
                            border-[#C084CC]/30
                            bg-[#F8ECFA]
                            p-3
                            text-center
                          "
                        >

                          <p className="text-[10px] font-medium text-gray-500">
                            الكمية المتاحة
                          </p>

                          <p className="mt-1 text-lg font-bold text-[#7B2C8E]">
                            {stock}
                          </p>

                        </div>

                      </div>

                      {/* ID */}

                      <div
                        className="
                          rounded-xl
                          border
                          border-[#C084CC]/30
                          bg-white
                          px-3
                          py-3
                        "
                      >

                        <p className="text-[11px] font-medium text-gray-500">
                          Warehouse ID
                        </p>

                        <p
                          className="
                            mt-0.5
                            truncate
                            font-mono
                            text-xs
                            font-semibold
                            text-[#7B2C8E]
                          "
                        >
                          {
                            warehouse.warehouse_id
                          }
                        </p>

                      </div>

                      {/* DELETE */}

                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={
                          remove.isPending
                        }
                        onClick={() => {

                          if (products > 0) {
                            toast.error(
                              "لا يمكن حذف المخزن لأنه يحتوي على منتجات",
                            );
                            return;
                          }

                          setToDelete(
                            warehouse,
                          );
                        }}
                        className="
                          w-full
                          border
                          border-[#C084CC]/30
                          bg-white
                          text-gray-700
                          transition-all
                          hover:border-red-300
                          hover:bg-red-50
                          hover:text-red-600
                        "
                      >
                        <Trash2
                          className="
                            me-1
                            h-4 w-4
                            text-red-500
                          "
                        />

                        {t("delete")}
                      </Button>

                    </div>
                  </Card>
                );
              },
            )}
          </div>
        )}

        {/* =====================================================
            DELETE CONFIRMATION
        ====================================================== */}

        <ConfirmDialog
          open={toDelete !== null}
          onOpenChange={(open) => {
            if (!open) {
              setToDelete(null);
            }
          }}
          title={t(
            "confirm_delete_warehouse",
          )}
          busy={remove.isPending}
          onConfirm={handleDelete}
        />

      </div>
    </AppShell>
  );
}