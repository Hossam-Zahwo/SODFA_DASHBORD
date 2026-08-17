import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, Warehouse as WarehouseIcon } from "lucide-react";
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

  const count = (id: string) =>
    (inventory.data ?? []).filter(
      (p) => p.warehouse === id,
    ).length;

  return (
    <AppShell title={t("warehouses")}>
      <div className="min-h-full space-y-6">

        {/* =====================================================
            HEADER / ADD WAREHOUSE
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
                  إدارة المستودعات وإضافة مستودع جديد
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
                onClick={() => {
                  if (!name.trim()) {
                    toast.error(
                      t("err_required"),
                    );
                    return;
                  }

                  create.mutate(
                    name.trim(),
                    {
                      onSuccess: () => {
                        toast.success(
                          t("saved"),
                        );
                        setName("");
                      },

                      onError: (e) =>
                        toast.error(
                          errorMessage(
                            e,
                            lang,
                          ),
                        ),
                    },
                  );
                }}
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

                {t("add_warehouse")}
              </Button>
            </div>
          </div>
        </Card>

        {/* =====================================================
            WAREHOUSES
        ====================================================== */}

        {warehouses.isLoading ? (
          <Card
            className="
              border
              border-[#C084CC]/30
              bg-white
              p-6
              shadow-sm
            "
          >
            <Blocks.Loading label={t("loading")} />
          </Card>
        ) : warehouses.isError ? (
          <Card
            className="
              border
              border-[#C084CC]/30
              bg-white
              p-6
              shadow-sm
            "
          >
            <Blocks.Error
              label={errorMessage(
                warehouses.error,
                lang,
              )}
            />
          </Card>
        ) : (warehouses.data ?? []).length === 0 ? (
          <Card
            className="
              border
              border-[#C084CC]/30
              bg-white
              p-6
              shadow-sm
            "
          >
            <Blocks.Empty
              label={t("no_results")}
            />
          </Card>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {(warehouses.data ?? []).map((w) => {
              const productCount = count(
                w.warehouse_id,
              );

              return (
                <Card
                  key={w.warehouse_id}
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
                  {/* TOP PURPLE LINE */}

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

                    {/* WAREHOUSE HEADER */}

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
                          {w.warehouse_name}
                        </p>

                      </div>

                    </div>

                    {/* WAREHOUSE NAME INPUT */}

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
                          w.warehouse_name
                        }
                        onBlur={(e) => {
                          const v =
                            e.target.value.trim();

                          if (
                            !v ||
                            v ===
                              w.warehouse_name
                          ) {
                            return;
                          }

                          rename.mutate(
                            {
                              id: w.warehouse_id,
                              name: v,
                            },
                            {
                              onSuccess: () =>
                                toast.success(
                                  t("saved"),
                                ),

                              onError: (err) =>
                                toast.error(
                                  errorMessage(
                                    err,
                                    lang,
                                  ),
                                ),
                            },
                          );
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

                    {/* INFO */}

                    <div
                      className="
                        flex
                        items-center
                        justify-between
                        rounded-xl
                        border
                        border-[#C084CC]/30
                        bg-[#F8ECFA]
                        px-3
                        py-3
                      "
                    >

                      <div className="min-w-0">

                        <p
                          className="
                            text-[11px]
                            font-medium
                            text-gray-500
                          "
                        >
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
                          {w.warehouse_id}
                        </p>

                      </div>

                      <div
                        className="
                          rounded-lg
                          bg-white
                          px-3
                          py-2
                          text-center
                          shadow-sm
                          ring-1
                          ring-[#C084CC]/30
                        "
                      >

                        <p
                          className="
                            text-lg
                            font-bold
                            text-[#7B2C8E]
                          "
                        >
                          {productCount}
                        </p>

                        <p
                          className="
                            whitespace-nowrap
                            text-[10px]
                            font-medium
                            text-gray-500
                          "
                        >
                          {t(
                            "products_count",
                          )}
                        </p>

                      </div>

                    </div>

                    {/* DELETE */}

                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (
                          productCount > 0
                        ) {
                          toast.error(
                            t(
                              "warehouse_has_stock",
                            ),
                          );
                          return;
                        }

                        setToDelete(w);
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
                          transition-colors
                          group-hover:text-red-600
                        "
                      />

                      {t("delete")}
                    </Button>

                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* =====================================================
            DELETE DIALOG
        ====================================================== */}

        <ConfirmDialog
          open={toDelete !== null}
          onOpenChange={(v) =>
            !v && setToDelete(null)
          }
          title={t(
            "confirm_delete_warehouse",
          )}
          busy={remove.isPending}
          onConfirm={() => {
            if (!toDelete) return;

            remove.mutate(
              toDelete.warehouse_id,
              {
                onSuccess: () => {
                  toast.success(
                    t("deleted"),
                  );

                  setToDelete(null);
                },

                onError: (e) =>
                  toast.error(
                    errorMessage(
                      e,
                      lang,
                    ),
                  ),
              },
            );
          }}
        />

      </div>
    </AppShell>
  );
}