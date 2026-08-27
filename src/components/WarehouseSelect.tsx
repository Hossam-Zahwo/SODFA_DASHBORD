import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import type { Warehouse } from "@/lib/api";

export const ALL_WAREHOUSES = "__all__";

type Props =
  | {
      value: string;
      onChange: (value: string) => void;
      warehouses: Warehouse[];
      includeAll?: boolean;
      className?: string;
    }
  | {
      value: string[];
      onChange: (value: string[]) => void;
      warehouses: Warehouse[];
      includeAll?: boolean;
      className?: string;
    };

export function WarehouseSelect({
  value,
  onChange,
  warehouses,
  includeAll = false,
  className = "",
}: Props) {
  const { t } = useI18n();

  // Single warehouse mode
  if (!Array.isArray(value)) {
    return (
      <Select value={value} onValueChange={onChange as (v: string) => void}>
        <SelectTrigger className={className}>
          <SelectValue placeholder={t("select_warehouse")} />
        </SelectTrigger>

        <SelectContent className="z-[999999]">
          {includeAll && (
            <SelectItem value={ALL_WAREHOUSES}>
              {t("all_warehouses")}
            </SelectItem>
          )}

          {warehouses.map((w) => (
            <SelectItem key={w.warehouse_id} value={w.warehouse_id}>
              {w.warehouse_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Multi warehouse mode
  return (
    <MultiWarehouseSelect
      value={value}
      onChange={onChange as (v: string[]) => void}
      warehouses={warehouses}
      includeAll={includeAll}
      className={className}
      allLabel={t("all_warehouses")}
      placeholder={t("select_warehouse")}
    />
  );
}

function MultiWarehouseSelect({
  value,
  onChange,
  warehouses,
  includeAll,
  className,
  allLabel,
  placeholder,
}: {
  value: string[];
  onChange: (value: string[]) => void;
  warehouses: Warehouse[];
  includeAll: boolean;
  className: string;
  allLabel: string;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);

  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const allSelected = value.includes(ALL_WAREHOUSES);

  /*
   * حساب مكان القائمة بالنسبة للشاشة.
   * القائمة نفسها سيتم وضعها في body عن طريق Portal،
   * وبالتالي لن تتأثر بأي overflow أو z-index في الـ section الأب.
   */
  const updatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();

    setDropdownPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  };

  useEffect(() => {
    if (!open) return;

    updatePosition();

    const handleScroll = () => {
      updatePosition();
    };

    const handleResize = () => {
      updatePosition();
    };

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      const trigger = triggerRef.current;

      const dropdown = document.getElementById(
        "warehouse-multi-select-dropdown"
      );

      if (
        trigger &&
        !trigger.contains(target) &&
        dropdown &&
        !dropdown.contains(target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [open]);

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange([ALL_WAREHOUSES]);
    }
  };

  const toggleWarehouse = (id: string) => {
    if (allSelected) {
      onChange([id]);
      return;
    }

    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const clear = () => {
    onChange([]);
  };

  const label = allSelected
    ? allLabel
    : value.length === 0
      ? placeholder
      : value.length === 1
        ? warehouses.find(
            (w) => w.warehouse_id === value[0]
          )?.warehouse_name ?? placeholder
        : `${value.length} مستودعات مختارة`;

  return (
    <>
      {/* SELECT BUTTON */}
      <div
        dir="rtl"
        className={`relative w-full ${className}`}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() => {
            if (!open) {
              updatePosition();
            }

            setOpen((v) => !v);
          }}
          className="flex h-full min-h-[42px] w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition focus:ring-2 focus:ring-ring"
        >
          <span
            className={`min-w-0 flex-1 truncate text-right ${
              value.length === 0
                ? "text-muted-foreground"
                : ""
            }`}
          >
            {label}
          </span>

          <ChevronDown
            className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
              open ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* DROPDOWN - RENDERED DIRECTLY IN BODY */}
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            id="warehouse-multi-select-dropdown"
            dir="rtl"
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              zIndex: 999999,
            }}
            className="overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl"
          >
            {/* HEADER */}
            <div className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-medium">
                اختيار المستودعات
              </span>

              {value.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  مسح
                </button>
              )}
            </div>

            {/* WAREHOUSES */}
            <div className="max-h-[280px] overflow-y-auto p-1.5">
              {/* ALL WAREHOUSES */}
              {includeAll && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-right text-sm hover:bg-accent ${
                    allSelected
                      ? "bg-primary/10 text-primary"
                      : ""
                  }`}
                >
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                      allSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input"
                    }`}
                  >
                    {allSelected && (
                      <Check className="h-3 w-3" />
                    )}
                  </span>

                  <span className="flex-1">
                    {allLabel}
                  </span>
                </button>
              )}

              {/* WAREHOUSES */}
              {warehouses.map((warehouse) => {
                const selected =
                  !allSelected &&
                  value.includes(warehouse.warehouse_id);

                return (
                  <button
                    type="button"
                    key={warehouse.warehouse_id}
                    onClick={() =>
                      toggleWarehouse(
                        warehouse.warehouse_id
                      )
                    }
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-right text-sm hover:bg-accent ${
                      selected
                        ? "bg-primary/10 text-primary"
                        : ""
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input"
                      }`}
                    >
                      {selected && (
                        <Check className="h-3 w-3" />
                      )}
                    </span>

                    <span className="flex-1 truncate">
                      {warehouse.warehouse_name}
                    </span>
                  </button>
                );
              })}

              {/* EMPTY */}
              {warehouses.length === 0 && (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">
                  لا توجد مستودعات
                </div>
              )}
            </div>

            {/* SELECTED WAREHOUSES */}
            {!allSelected && value.length > 0 && (
              <div className="border-t bg-muted/30 p-2">
                <div className="flex flex-wrap gap-1.5">
                  {value.map((id) => {
                    const warehouse = warehouses.find(
                      (w) =>
                        w.warehouse_id === id
                    );

                    if (!warehouse) return null;

                    return (
                      <span
                        key={id}
                        className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs text-primary"
                      >
                        <span className="max-w-[120px] truncate">
                          {warehouse.warehouse_name}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            onChange(
                              value.filter(
                                (x) => x !== id
                              )
                            )
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>,
          document.body
        )}
    </>
  );
}