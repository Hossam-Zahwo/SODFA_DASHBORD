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

  // =========================================================
  // SINGLE WAREHOUSE MODE
  // =========================================================

  if (!Array.isArray(value)) {
    return (
      <Select
        value={value}
        onValueChange={onChange as (v: string) => void}
      >
        <SelectTrigger className={className}>
          <SelectValue placeholder={t("select_warehouse")} />
        </SelectTrigger>

        <SelectContent className="z-[999999]">
          {includeAll && (
            <SelectItem value={ALL_WAREHOUSES}>
              {t("all_warehouses")}
            </SelectItem>
          )}

          {warehouses.map((warehouse) => (
            <SelectItem
              key={warehouse.warehouse_id}
              value={warehouse.warehouse_id}
            >
              {warehouse.warehouse_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // =========================================================
  // MULTI WAREHOUSE MODE
  // =========================================================

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

// =========================================================
// MULTI WAREHOUSE SELECT
// =========================================================

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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });

  const allSelected = value.includes(ALL_WAREHOUSES);

  // =========================================================
  // UPDATE DROPDOWN POSITION
  // =========================================================

  const updatePosition = () => {
    if (!triggerRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();

    const dropdownWidth = Math.max(rect.width, 260);

    // RTL:
    // نحاول نخلي القائمة تبدأ من نفس الناحية المناسبة للزر.
    let left = rect.left;

    // منع خروج القائمة من الشاشة ناحية اليمين.
    if (left + dropdownWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - dropdownWidth - 8);
    }

    // منع خروج القائمة من الشاشة ناحية اليسار.
    if (left < 8) {
      left = 8;
    }

    setDropdownPosition({
      top: rect.bottom + 8,
      left,
      width: dropdownWidth,
    });
  };

  // =========================================================
  // POSITION LISTENERS
  // =========================================================

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

  // =========================================================
  // ESCAPE KEY
  // =========================================================

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

  // =========================================================
  // OUTSIDE CLICK
  // =========================================================

  useEffect(() => {
    if (!open) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;

      const trigger = triggerRef.current;
      const dropdown = dropdownRef.current;

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
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [open]);

  // =========================================================
  // ALL WAREHOUSES
  // =========================================================

  const toggleAll = () => {
    if (allSelected) {
      onChange([]);
    } else {
      onChange([ALL_WAREHOUSES]);
    };
  };

  // =========================================================
  // TOGGLE SINGLE WAREHOUSE
  // =========================================================

  const toggleWarehouse = (id: string) => {
    // لو "كل المستودعات" مختارة وقام المستخدم باختيار مستودع
    // ننتقل مباشرة لاختيار المستودع ده فقط.
    if (allSelected) {
      onChange([id]);
      return;
    }

    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
    } else {
      onChange([...value, id]);
    }
  };

  // =========================================================
  // CLEAR
  // =========================================================

  const clear = () => {
    onChange([]);
  };

  // =========================================================
  // DISPLAY LABEL
  // =========================================================

  const selectedWarehouseNames = warehouses
    .filter((warehouse) =>
      value.includes(warehouse.warehouse_id)
    )
    .map((warehouse) => warehouse.warehouse_name);

  const label = allSelected
    ? allLabel
    : value.length === 0
      ? placeholder
      : value.length === 1
        ? selectedWarehouseNames[0] ?? placeholder
        : `${value.length} مستودعات مختارة`;

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      {/* =====================================================
          SELECT BUTTON
          ===================================================== */}

      <div
        dir="rtl"
        className={`relative w-full ${className}`}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => {
            if (!open) {
              updatePosition();
            }

            setOpen((current) => !current);
          }}
          className="
            flex
            h-full
            min-h-[42px]
            w-full
            items-center
            justify-between
            gap-2
            rounded-md
            border
            border-input
            bg-background
            px-3
            py-2
            text-sm
            shadow-sm
            outline-none
            transition
            hover:bg-accent/40
            focus:ring-2
            focus:ring-ring
          "
        >
          <span
            className={`
              min-w-0
              flex-1
              truncate
              text-right
              ${
                value.length === 0
                  ? "text-muted-foreground"
                  : ""
              }
            `}
          >
            {label}
          </span>

          <ChevronDown
            className={`
              h-4
              w-4
              shrink-0
              text-muted-foreground
              transition-transform
              duration-200
              ${
                open
                  ? "rotate-180"
                  : ""
              }
            `}
          />
        </button>
      </div>

      {/* =====================================================
          DROPDOWN
          ===================================================== */}

      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={dropdownRef}
            id="warehouse-multi-select-dropdown"
            dir="rtl"
            role="listbox"
            aria-multiselectable="true"
            style={{
              position: "fixed",
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxWidth: "calc(100vw - 16px)",
              zIndex: 999999,
            }}
            className="
              overflow-hidden
              rounded-xl
              border
              border-border
              bg-popover
              text-popover-foreground
              shadow-2xl
            "
          >
            {/* =================================================
                HEADER
                ================================================= */}

            <div
              className="
                flex
                items-center
                justify-between
                gap-3
                border-b
                px-3
                py-2.5
              "
            >
              <span className="text-sm font-semibold">
                اختيار المستودعات
              </span>

              {value.length > 0 && (
                <button
                  type="button"
                  onClick={clear}
                  className="
                    rounded-md
                    px-2
                    py-1
                    text-xs
                    font-medium
                    text-muted-foreground
                    transition
                    hover:bg-accent
                    hover:text-foreground
                  "
                >
                  مسح الكل
                </button>
              )}
            </div>

            {/* =================================================
                WAREHOUSES LIST
                ================================================= */}

            <div className="max-h-[300px] overflow-y-auto p-1.5">
              {/* =================================================
                  ALL WAREHOUSES
                  ================================================= */}

              {includeAll && (
                <button
                  type="button"
                  role="option"
                  aria-selected={allSelected}
                  onClick={toggleAll}
                  className={`
                    flex
                    w-full
                    items-center
                    gap-3
                    rounded-lg
                    px-3
                    py-2.5
                    text-right
                    text-sm
                    transition
                    hover:bg-accent
                    ${
                      allSelected
                        ? "bg-primary/10 text-primary"
                        : ""
                    }
                  `}
                >
                  <span
                    className={`
                      flex
                      h-4
                      w-4
                      shrink-0
                      items-center
                      justify-center
                      rounded
                      border
                      transition
                      ${
                        allSelected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background"
                      }
                    `}
                  >
                    {allSelected && (
                      <Check className="h-3 w-3" />
                    )}
                  </span>

                  <span className="flex-1 truncate">
                    {allLabel}
                  </span>
                </button>
              )}

              {/* =================================================
                  SEPARATOR
                  ================================================= */}

              {includeAll && warehouses.length > 0 && (
                <div className="my-1 border-t" />
              )}

              {/* =================================================
                  WAREHOUSES
                  ================================================= */}

              {warehouses.map((warehouse) => {
                const selected =
                  !allSelected &&
                  value.includes(
                    warehouse.warehouse_id
                  );

                return (
                  <button
                    type="button"
                    role="option"
                    aria-selected={selected}
                    key={warehouse.warehouse_id}
                    onClick={() =>
                      toggleWarehouse(
                        warehouse.warehouse_id
                      )
                    }
                    className={`
                      flex
                      w-full
                      items-center
                      gap-3
                      rounded-lg
                      px-3
                      py-2.5
                      text-right
                      text-sm
                      transition
                      hover:bg-accent
                      ${
                        selected
                          ? "bg-primary/10 text-primary"
                          : ""
                      }
                    `}
                  >
                    <span
                      className={`
                        flex
                        h-4
                        w-4
                        shrink-0
                        items-center
                        justify-center
                        rounded
                        border
                        transition
                        ${
                          selected
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-input bg-background"
                        }
                      `}
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

              {/* =================================================
                  EMPTY STATE
                  ================================================= */}

              {warehouses.length === 0 && (
                <div
                  className="
                    px-3
                    py-7
                    text-center
                    text-sm
                    text-muted-foreground
                  "
                >
                  لا توجد مستودعات
                </div>
              )}
            </div>

            {/* =================================================
                SELECTED WAREHOUSES
                ================================================= */}

            {!allSelected && value.length > 0 && (
              <div
                className="
                  border-t
                  bg-muted/30
                  p-2.5
                "
              >
                <div className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                  المستودعات المختارة
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {value.map((id) => {
                    const warehouse = warehouses.find(
                      (item) =>
                        item.warehouse_id === id
                    );

                    if (!warehouse) return null;

                    return (
                      <span
                        key={id}
                        className="
                          inline-flex
                          max-w-full
                          items-center
                          gap-1
                          rounded-md
                          bg-primary/10
                          px-2
                          py-1
                          text-xs
                          text-primary
                        "
                      >
                        <span className="max-w-[140px] truncate">
                          {warehouse.warehouse_name}
                        </span>

                        <button
                          type="button"
                          aria-label={`إزالة ${warehouse.warehouse_name}`}
                          onClick={() =>
                            onChange(
                              value.filter(
                                (item) => item !== id
                              )
                            )
                          }
                          className="
                            rounded-sm
                            p-0.5
                            transition
                            hover:bg-primary/20
                          "
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