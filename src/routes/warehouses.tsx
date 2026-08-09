import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Blocks } from "@/components/blocks-export";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useApiMutation, useInventory, useWarehouses } from "@/hooks/useSodfa";
import { api, type Warehouse } from "@/lib/api";
import { errorMessage, useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/warehouses")({
  head: () => ({
    meta: [
      { title: "Warehouses — SODFA صدفة" },
      { name: "description", content: "Create, rename and remove SODFA warehouses dynamically." },
      { property: "og:title", content: "Warehouses — SODFA صدفة" },
      { property: "og:description", content: "Dynamic warehouse management." },
    ],
  }),
  component: WarehousesPage,
});

function WarehousesPage() {
  const { t, lang } = useI18n();
  const warehouses = useWarehouses();
  const inventory = useInventory();
  const [name, setName] = useState("");
  const [toDelete, setToDelete] = useState<Warehouse | null>(null);

  const create = useApiMutation((n: string) => api.saveWarehouse(n));
  const rename = useApiMutation((p: { id: string; name: string }) =>
    api.updateWarehouse(p.id, p.name),
  );
  const remove = useApiMutation((id: string) => api.deleteWarehouse(id));

  const count = (id: string) =>
    (inventory.data ?? []).filter((p) => p.warehouse === id).length;

  return (
    <AppShell title={t("warehouses")}>
      <div className="space-y-5">
        <Card className="flex flex-wrap items-center gap-3 p-4">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("warehouse_name")}
            className="w-full sm:max-w-xs"
          />
          <Button
            disabled={create.isPending}
            onClick={() => {
              if (!name.trim()) {
                toast.error(t("err_required"));
                return;
              }
              create.mutate(name.trim(), {
                onSuccess: () => {
                  toast.success(t("saved"));
                  setName("");
                },
                onError: (e) => toast.error(errorMessage(e, lang)),
              });
            }}
          >
            <Plus className="me-1 h-4 w-4" />
            {t("add_warehouse")}
          </Button>
        </Card>

        {warehouses.isLoading ? (
          <Blocks.Loading label={t("loading")} />
        ) : warehouses.isError ? (
          <Blocks.Error label={errorMessage(warehouses.error, lang)} />
        ) : (warehouses.data ?? []).length === 0 ? (
          <Blocks.Empty label={t("no_results")} />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(warehouses.data ?? []).map((w) => (
              <Card key={w.warehouse_id} className="space-y-3 p-4">
                <Input
                  defaultValue={w.warehouse_name}
                  onBlur={(e) => {
                    const v = e.target.value.trim();
                    if (!v || v === w.warehouse_name) return;
                    rename.mutate(
                      { id: w.warehouse_id, name: v },
                      {
                        onSuccess: () => toast.success(t("saved")),
                        onError: (err) => toast.error(errorMessage(err, lang)),
                      },
                    );
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  {w.warehouse_id} • {t("products_count")}: {count(w.warehouse_id)}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    if (count(w.warehouse_id) > 0) {
                      toast.error(t("warehouse_has_stock"));
                      return;
                    }
                    setToDelete(w);
                  }}
                >
                  <Trash2 className="me-1 h-4 w-4 text-destructive" />
                  {t("delete")}
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(v) => !v && setToDelete(null)}
        title={t("confirm_delete_warehouse")}
        busy={remove.isPending}
        onConfirm={() => {
          if (!toDelete) return;
          remove.mutate(toDelete.warehouse_id, {
            onSuccess: () => {
              toast.success(t("deleted"));
              setToDelete(null);
            },
            onError: (e) => toast.error(errorMessage(e, lang)),
          });
        }}
      />
    </AppShell>
  );
}