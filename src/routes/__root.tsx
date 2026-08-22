import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { LanguageProvider } from "@/lib/i18n";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "../lib/supabase";

/* ============================================================
   404 PAGE
   ============================================================ */

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">
          404
        </h1>

        <h2 className="mt-4 text-xl font-semibold text-foreground">
          Page not found
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ERROR PAGE
   ============================================================ */

function ErrorComponent({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  console.error(error);

  const router = useRouter();

  useEffect(() => {
    reportLovableError(error, {
      boundary: "tanstack_root_error_component",
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>

        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>

          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ROOT ROUTE
   ============================================================ */

export const Route =
  createRootRouteWithContext<{
    queryClient: QueryClient;
  }>()({
    head: () => ({
      /* ========================================================
         META TAGS
         ======================================================== */

      meta: [
        {
          charSet: "utf-8",
        },

        {
          name: "viewport",
          content: "width=device-width, initial-scale=1",
        },

        {
          title: "SODFA صدفة — Inventory, Sales & Returns",
        },

        {
          name: "description",
          content:
            "SODFA store management: inventory, sales, returns and damaged returns powered by Google Sheets.",
        },

        {
          name: "author",
          content: "SODFA",
        },

        {
          property: "og:title",
          content: "SODFA صدفة — Store Management",
        },

        {
          property: "og:description",
          content:
            "Inventory, sales, returns and damaged returns for the SODFA brand.",
        },

        {
          property: "og:type",
          content: "website",
        },

        {
          name: "twitter:card",
          content: "summary_large_image",
        },

        /* ======================================================
           THEME / MOBILE
           ====================================================== */

        {
          name: "theme-color",
          content: "#0B2A52",
        },

        {
          name: "mobile-web-app-capable",
          content: "yes",
        },

        {
          name: "apple-mobile-web-app-capable",
          content: "yes",
        },

        {
          name: "apple-mobile-web-app-status-bar-style",
          content: "default",
        },

        {
          name: "apple-mobile-web-app-title",
          content: "SODFA",
        },
      ],

      /* ========================================================
         LINKS
         ======================================================== */

      links: [
        /* Main CSS */
        {
          rel: "stylesheet",
          href: appCss,
        },

        /* ======================================================
           FAVICON
           ====================================================== */

        {
          rel: "icon",
          href: "/favicon.ico",
          type: "image/x-icon",
        },

        {
          rel: "icon",
          href: "/favicon-16x16.png",
          type: "image/png",
          sizes: "16x16",
        },

        {
          rel: "icon",
          href: "/favicon-32x32.png",
          type: "image/png",
          sizes: "32x32",
        },

        {
          rel: "icon",
          href: "/android-chrome-192x192.png",
          type: "image/png",
          sizes: "192x192",
        },

        {
          rel: "icon",
          href: "/android-chrome-512x512.png",
          type: "image/png",
          sizes: "512x512",
        },

        /* ======================================================
           APPLE ICON
           ====================================================== */

        {
          rel: "apple-touch-icon",
          href: "/apple-touch-icon.png",
          sizes: "180x180",
        },

        /* ======================================================
           WEB MANIFEST
           ====================================================== */

        {
          rel: "manifest",
          href: "/site.webmanifest",
        },
      ],
    }),

    shellComponent: RootShell,

    component: RootComponent,

    notFoundComponent: NotFoundComponent,

    errorComponent: ErrorComponent,
  });

/* ============================================================
   ROOT SHELL
   ============================================================ */

function RootShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>

      <body>
        {children}

        <Scripts />
      </body>
    </html>
  );
}

/* ============================================================
   ROOT COMPONENT
   ============================================================ */

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <AuthGate />

        <Toaster
          position="top-center"
          richColors
        />
      </LanguageProvider>
    </QueryClientProvider>
  );
}

function AuthGate() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [checking, setChecking] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setAuthenticated(Boolean(session?.user));
        setChecking(false);
      }
    };

    void checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) {
        return;
      }

      const hasSession = Boolean(session?.user);
      setAuthenticated(hasSession);

      if (event === "SIGNED_OUT") {
        window.location.replace("/login");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const isLoginPage = pathname.startsWith("/login");

  useEffect(() => {
    if (checking) {
      return;
    }

    if (!authenticated && !isLoginPage) {
      window.location.replace("/login");
    }

    if (authenticated && isLoginPage) {
      window.location.replace("/");
    }
  }, [authenticated, checking, isLoginPage]);

  if (checking || (!authenticated && !isLoginPage) || (authenticated && isLoginPage)) {
    return <div className="min-h-screen bg-[#08070b]" />;
  }

  return <Outlet />;
}