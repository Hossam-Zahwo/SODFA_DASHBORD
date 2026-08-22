import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  Menu,
  PackageX,
  RotateCcw,
  ScanLine,
  Settings as SettingsIcon,
  ShoppingCart,
  Warehouse as WarehouseIcon,
  LogOut,
  UserCircle,
} from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { useI18n, type TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";

import { supabase } from "@/lib/supabase";

/* ============================================================
   BRAND COLORS
   ============================================================ */

const BRAND = {
  purple: "#823292",
  purpleLight: "#A94FBC",
  purpleDark: "#642472",
  purpleSoft: "#2A1530",

  black: "#000000",
  background: "#0A0A0C",
  sidebar: "#08080A",
  card: "#111114",

  white: "#FFFFFF",
  whiteSoft: "#EDEDED",
  muted: "#A1A1AA",
  border: "#27272A",
};

/* ============================================================
   GOOGLE FONTS
   ============================================================ */

const FONT_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&family=Montserrat:wght@400;500;600;700;800&display=swap');
`;

/* ============================================================
   NAVIGATION
   ============================================================ */

const NAV: {
  to: string;
  key: TKey;
  icon: typeof Boxes;
}[] = [
  {
    to: "/",
    key: "dashboard",
    icon: BarChart3,
  },

  {
    to: "/inventory",
    key: "inventory",
    icon: Boxes,
  },

  {
    to: "/sales",
    key: "sales",
    icon: ShoppingCart,
  },

  {
    to: "/transactions",
    key: "transactions",
    icon: ArrowLeftRight,
  },

  {
    to: "/returns",
    key: "normal_returns",
    icon: RotateCcw,
  },

  {
    to: "/damaged-returns",
    key: "damaged_returns",
    icon: PackageX,
  },

  {
    to: "/warehouses",
    key: "warehouses",
    icon: WarehouseIcon,
  },

  {
    to: "/scanner",
    key: "scanner",
    icon: ScanLine,
  },
  {
    to: "/settings",
    key: "settings",
    icon: SettingsIcon,
  },
];

/* ============================================================
   NAVIGATION LINKS
   ============================================================ */

function NavLinks({
  onNavigate,
}: {
  onNavigate?: () => void;
}) {
  const { t } = useI18n();

  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  return (
    <nav className="flex flex-col gap-1.5 px-3">
      {NAV.map(({ to, key, icon: Icon }) => {
        const active =
          to === "/"
            ? pathname === "/"
            : pathname.startsWith(to);

        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              `
                group
                relative
                flex
                items-center
                gap-3
                rounded-xl
                px-4
                py-3
                text-[15px]
                font-medium
                transition-all
                duration-200
              `,
              active
                ? `
                  bg-[#2A1530]
                  text-white
                  shadow-[0_0_20px_rgba(130,50,146,0.12)]
                `
                : `
                  text-zinc-400
                  hover:bg-[#17121A]
                  hover:text-white
                `,
            )}
            style={{
              fontFamily: '"Cairo", sans-serif',
            }}
          >
            {/* Active Indicator */}

            {active && (
              <span
                className="
                  absolute
                  start-0
                  top-1/2
                  h-7
                  w-1
                  -translate-y-1/2
                  rounded-e-full
                "
                style={{
                  backgroundColor: BRAND.purple,
                }}
              />
            )}

            {/* Icon */}

            <Icon
              className={cn(
                "h-5 w-5 shrink-0 transition-all duration-200",
                active
                  ? "text-[#A94FBC]"
                  : "text-zinc-500 group-hover:text-[#A94FBC]",
                "group-hover:scale-105",
              )}
            />

            {/* Label */}

            <span className="truncate">
              {t(key)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

/* ============================================================
   BRAND
   ============================================================ */

function Brand() {
  return (
    <div
      className="
        flex
        w-full
        flex-col
        items-center
        justify-center
        px-6
        py-7
        text-center
      "
    >
      {/* Arabic Brand */}

      <p
        className="
          text-3xl
          font-black
          leading-none
        "
        style={{
          fontFamily: '"Cairo", sans-serif',
          letterSpacing: "-0.04em",
          color: BRAND.white,
        }}
      >
        صدفه
      </p>

      {/* English Brand */}

      <p
        className="
          mt-2
          text-sm
          font-bold
        "
        style={{
          fontFamily: '"Montserrat", sans-serif',
          letterSpacing: "0.30em",
          color: BRAND.purpleLight,
        }}
      >
        SODFA
      </p>

      {/* Small Brand Line */}

      <div
        className="mt-4 h-[2px] w-10 rounded-full"
        style={{
          backgroundColor: BRAND.purple,
        }}
      />
    </div>
  );
}

/* ============================================================
   LANGUAGE TOGGLE
   ============================================================ */

function LanguageToggle() {
  const { lang, setLang } = useI18n();

  return (
    <div
      className="
        flex
        gap-1
        rounded-xl
        border
        p-1
      "
      style={{
        borderColor: BRAND.border,
        backgroundColor: BRAND.card,
      }}
    >
      {(["ar", "en"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          className={cn(
            `
              rounded-lg
              px-3
              py-1
              text-sm
              font-medium
              transition-all
              duration-200
            `,
            lang === l
              ? `
                text-white
                shadow-sm
              `
              : `
                text-zinc-500
                hover:bg-zinc-800
                hover:text-white
              `,
          )}
          style={
            lang === l
              ? {
                  backgroundColor: BRAND.purple,
                  fontFamily:
                    l === "ar"
                      ? '"Cairo", sans-serif'
                      : '"Montserrat", sans-serif',
                }
              : {
                  fontFamily:
                    l === "ar"
                      ? '"Cairo", sans-serif'
                      : '"Montserrat", sans-serif',
                }
          }
        >
          {l === "ar" ? "العربية" : "English"}
        </button>
      ))}
    </div>
  );
}

/* ============================================================
   ACCOUNT SECTION
   ============================================================ */

function AccountSection() {
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (mounted) {
        setEmail(user?.email ?? "");
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (mounted) {
          setEmail(session?.user?.email ?? "");
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /* ============================================================
     LOGOUT
     ============================================================ */

  const handleLogout = async () => {
    const { error } =
      await supabase.auth.signOut();

    if (error) {
      console.error(
        "Logout error:",
        error,
      );

      return;
    }

    window.location.href = "/login";
  };

  return (
    <div className="px-4 pb-4">
      <div
        className="
          rounded-xl
          border
          p-3
        "
        style={{
          backgroundColor: BRAND.card,
          borderColor: BRAND.border,
        }}
      >
        {/* USER INFO */}

        <div className="flex items-center gap-3">
          <div
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
            "
            style={{
              backgroundColor:
                "rgba(130,50,146,0.12)",
              color: BRAND.purpleLight,
            }}
          >
            <UserCircle className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="text-xs font-bold text-white"
              style={{
                fontFamily:
                  '"Cairo", sans-serif',
              }}
            >
              الحساب
            </p>

            <p
              dir="ltr"
              className="
                mt-0.5
                truncate
                text-[10px]
                text-zinc-500
              "
            >
              {email || "جاري التحميل..."}
            </p>
          </div>
        </div>

        {/* LOGOUT BUTTON */}

        <button
          type="button"
          onClick={handleLogout}
          className="
            mt-3
            flex
            w-full
            items-center
            justify-center
            gap-2
            rounded-lg
            px-3
            py-2
            text-xs
            font-medium
            text-red-400
            transition-all
            duration-200
            hover:bg-red-500/10
            hover:text-red-300
          "
          style={{
            fontFamily:
              '"Cairo", sans-serif',
          }}
        >
          <LogOut className="h-4 w-4" />

          <span>
            تسجيل الخروج
          </span>
        </button>
      </div>
    </div>
  );
}

/* ============================================================
   APP SHELL
   ============================================================ */

export function AppShell({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const { dir } = useI18n();

  const [open, setOpen] =
    useState(false);

  return (
    <>
      {/* Load Fonts */}

      <style>
        {FONT_STYLES}
      </style>

      <div
        dir={dir}
        className="
          flex
          min-h-screen
          w-full
          text-white
        "
        style={{
          backgroundColor:
            BRAND.background,
          fontFamily:
            '"Cairo", sans-serif',
        }}
      >
        {/* ======================================================
            DESKTOP SIDEBAR
            ====================================================== */}

        <aside
          className="
            sticky
            top-0
            hidden
            h-screen
            w-72
            shrink-0
            flex-col
            border-e
            lg:flex
          "
          style={{
            backgroundColor:
              BRAND.sidebar,
            borderColor:
              BRAND.border,
          }}
        >
          {/* Brand */}

          <Brand />

          <div
            className="h-px"
            style={{
              backgroundColor:
                BRAND.border,
            }}
          />

          {/* Navigation */}

          <div
            className="
              mt-4
              flex-1
              overflow-y-auto
              pb-6
              scrollbar-thin
            "
          >
            <NavLinks />
          </div>

          {/* Account */}

          <AccountSection />

          {/* Sidebar Bottom Accent */}

          <div className="px-6 pb-5">
            <div
              className="
                h-px
                w-full
                opacity-40
              "
              style={{
                backgroundColor:
                  BRAND.purple,
              }}
            />
          </div>
        </aside>

        {/* ======================================================
            MAIN AREA
            ====================================================== */}

        <div className="flex min-w-0 flex-1 flex-col">

          {/* ====================================================
              HEADER
              ==================================================== */}

          <header
            className="
              sticky
              top-0
              z-20
              flex
              items-center
              gap-3
              border-b
              px-4
              py-3
              backdrop-blur-xl
              sm:px-6
            "
            style={{
              backgroundColor:
                "rgba(10,10,12,0.92)",
              borderColor:
                BRAND.border,
            }}
          >

            {/* Mobile Menu */}

            <Sheet
              open={open}
              onOpenChange={setOpen}
            >
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="
                    border
                    bg-[#111114]
                    text-white
                    hover:bg-[#1A151C]
                    lg:hidden
                  "
                  style={{
                    borderColor:
                      BRAND.border,
                  }}
                  aria-label="Menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>

              <SheetContent
                side={
                  dir === "rtl"
                    ? "right"
                    : "left"
                }
                className="
                  w-72
                  border
                  p-0
                  text-white
                "
                style={{
                  backgroundColor:
                    BRAND.sidebar,
                  borderColor:
                    BRAND.border,
                }}
              >
                <SheetTitle className="sr-only">
                  SODFA
                </SheetTitle>

                {/* Mobile Brand */}

                <Brand />

                <div
                  className="h-px"
                  style={{
                    backgroundColor:
                      BRAND.border,
                  }}
                />

                {/* Mobile Navigation */}

                <div className="mt-4">
                  <NavLinks
                    onNavigate={() =>
                      setOpen(false)
                    }
                  />
                </div>

                {/* Mobile Account */}

                <div className="mt-6">
                  <AccountSection />
                </div>
              </SheetContent>
            </Sheet>

            {/* Page Title */}

            <h1
              className="
                min-w-0
                flex-1
                truncate
                text-lg
                font-bold
                text-white
                sm:text-xl
              "
              style={{
                fontFamily:
                  '"Cairo", sans-serif',
              }}
            >
              {title}
            </h1>

            {/* Language */}

            <LanguageToggle />
          </header>

          {/* ====================================================
              PAGE CONTENT
              ==================================================== */}

          <main
            className="
              min-h-[calc(100vh-65px)]
              flex-1
              p-4
              sm:p-6
            "
            style={{
              backgroundColor:
                BRAND.background,
            }}
          >
            {children}
          </main>
        </div>
      </div>
    </>
  );
}