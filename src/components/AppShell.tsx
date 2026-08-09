import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Boxes,
  Menu,
  PackageX,
  RotateCcw,
  ScanLine,
  Settings as SettingsIcon,
  ShoppingCart,
  Warehouse as WarehouseIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV: { to: string; key: TKey; icon: typeof Boxes }[] = [
  { to: "/", key: "dashboard", icon: BarChart3 },
  { to: "/inventory", key: "inventory", icon: Boxes },
  { to: "/sales", key: "sales", icon: ShoppingCart },
  { to: "/returns", key: "normal_returns", icon: RotateCcw },
  { to: "/damaged-returns", key: "damaged_returns", icon: PackageX },
  { to: "/warehouses", key: "warehouses", icon: WarehouseIcon },
  { to: "/scanner", key: "scanner", icon: ScanLine },
  { to: "/settings", key: "settings", icon: SettingsIcon },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useI18n();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="flex flex-col gap-1 px-3">
      {NAV.map(({ to, key, icon: Icon }) => {
        const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-3 text-[15px] font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              active && "bg-sidebar-accent text-sidebar-accent-foreground shadow-sm",
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            <span>{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="px-6 py-6">
      <p className="text-3xl font-bold leading-none text-sidebar-primary">صدفة</p>
      <p className="mt-1 text-sm font-semibold tracking-[0.3em] text-sidebar-foreground/70">
        SODFA
      </p>
    </div>
  );
}

function LanguageToggle() {
  const { lang, setLang } = useI18n();
  return (
    <div className="flex gap-1 rounded-lg border border-border p-1">
      {(["ar", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground",
          )}
        >
          {l === "ar" ? "العربية" : "English"}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { dir } = useI18n();
  const [open, setOpen] = useState(false);

  return (
    <div dir={dir} className="flex min-h-screen w-full bg-surface text-foreground">
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 flex-col bg-sidebar lg:flex">
        <Brand />
        <div className="h-px bg-sidebar-border" />
        <div className="mt-4 flex-1 overflow-y-auto pb-6">
          <NavLinks />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="lg:hidden" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side={dir === "rtl" ? "right" : "left"} className="w-72 bg-sidebar p-0">
              <SheetTitle className="sr-only">SODFA</SheetTitle>
              <Brand />
              <div className="h-px bg-sidebar-border" />
              <div className="mt-4">
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="min-w-0 flex-1 truncate text-lg font-bold sm:text-xl">{title}</h1>
          <LanguageToggle />
        </header>

        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}