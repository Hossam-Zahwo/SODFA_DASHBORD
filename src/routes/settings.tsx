import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  DEFAULT_API_URL,
  api,
  getApiUrl,
  setApiUrl,
} from "@/lib/api";

import {
  LABEL_SIZES,
  getLabelSize,
  setLabelSize,
  type LabelSizeKey,
} from "@/lib/labels";

import { errorMessage, useI18n } from "@/lib/i18n";
import { keys } from "@/hooks/useSodfa";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      {
        title: "Settings — SODFA صدفة",
      },
      {
        name: "description",
        content:
          "Check the SODFA Google Sheets connection and sheet status.",
      },
      {
        property: "og:title",
        content: "Settings — SODFA صدفة",
      },
      {
        property: "og:description",
        content: "Connection and system health.",
      },
    ],
  }),

  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang } = useI18n();

  const conn = useQuery({
    queryKey: keys.connection,
    queryFn: api.connection,
    retry: 1,
  });

  const [url, setUrl] = useState(() => getApiUrl());
  const [size, setSize] = useState<LabelSizeKey>(() =>
    getLabelSize(),
  );

  const REQUIRED_SHEETS = [
    "Inventory",
    "Sales",
    "Returns",
    "Damaged_Returns",
    "Warehouses",
    "Dashboard",
    "Setup_Notes",
  ];

  return (
    <AppShell title={t("settings")}>
      <div className="space-y-6">

        {/* =====================================================
            PAGE HEADER
        ====================================================== */}

        <div className="overflow-hidden rounded-2xl border border-[#9B4BA8]/30 bg-gradient-to-r from-[#7B2C8E] via-[#9B4BA8] to-[#C084CC] p-6 text-white shadow-lg">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold">
              {t("settings")}
            </h1>

            <p className="text-sm text-white/80">
              إدارة إعدادات النظام والاتصال وقواعد البيانات
            </p>
          </div>
        </div>

        {/* =====================================================
            LANGUAGE
        ====================================================== */}

        <Card className="border border-[#9B4BA8]/25 bg-gradient-to-br from-white via-[#faf5fc] to-[#f3e5f5] p-5 shadow-sm transition-all duration-300 hover:border-[#9B4BA8]/60 hover:shadow-md">

          <div className="mb-4">
            <h2 className="text-lg font-bold text-[#7B2C8E]">
              {t("language")}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              اختر لغة واجهة النظام
            </p>
          </div>

          <div className="flex flex-wrap gap-3">

            <Button
              className={
                lang === "ar"
                  ? "border border-[#7B2C8E] bg-gradient-to-r from-[#7B2C8E] to-[#9B4BA8] text-white shadow-md hover:from-[#6b247b] hover:to-[#8d4299]"
                  : "border border-[#9B4BA8]/40 bg-white text-[#7B2C8E] hover:bg-[#C084CC]/15 hover:text-[#7B2C8E]"
              }
              onClick={() => setLang("ar")}
            >
              {t("arabic")}
            </Button>

            <Button
              className={
                lang === "en"
                  ? "border border-[#7B2C8E] bg-gradient-to-r from-[#7B2C8E] to-[#9B4BA8] text-white shadow-md hover:from-[#6b247b] hover:to-[#8d4299]"
                  : "border border-[#9B4BA8]/40 bg-white text-[#7B2C8E] hover:bg-[#C084CC]/15 hover:text-[#7B2C8E]"
              }
              onClick={() => setLang("en")}
            >
              {t("english")}
            </Button>

          </div>
        </Card>

        {/* =====================================================
            API SETTINGS
        ====================================================== */}

        <Card className="border border-[#9B4BA8]/25 bg-gradient-to-br from-white via-[#faf5fc] to-[#f3e5f5] p-5 shadow-sm transition-all duration-300 hover:border-[#9B4BA8]/60 hover:shadow-md">

          <div className="mb-5">
            <h2 className="text-lg font-bold text-[#7B2C8E]">
              {t("api_settings")}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              إعداد وربط Google Apps Script مع النظام
            </p>
          </div>

          <div className="space-y-2">

            <Label
              htmlFor="api-url"
              className="font-semibold text-[#7B2C8E]"
            >
              {t("api_url")}
            </Label>

            <Input
              id="api-url"
              dir="ltr"
              value={url}
              onChange={(e) =>
                setUrl(e.target.value)
              }
              placeholder={DEFAULT_API_URL}
              className="border-[#9B4BA8]/30 bg-white text-gray-800 placeholder:text-gray-400 focus:border-[#9B4BA8] focus:ring-[#C084CC]/30"
            />

          </div>

          <div className="mt-5 flex flex-wrap gap-3">

            <Button
              className="bg-gradient-to-r from-[#7B2C8E] via-[#9B4BA8] to-[#C084CC] text-white shadow-md transition-all hover:scale-[1.01] hover:from-[#6f287f] hover:via-[#8e429b] hover:to-[#b474bf]"
              onClick={() => {
                const clean = url.trim();

                if (
                  !/^https:\/\/script\.google\.com\/.+\/exec$/.test(
                    clean,
                  )
                ) {
                  toast.error(t("invalid_url"));
                  return;
                }

                setApiUrl(clean);
                toast.success(
                  t("api_url_saved"),
                );

                void conn.refetch();
              }}
            >
              {t("save_api_url")}
            </Button>

            <Button
              variant="outline"
              className="border-[#9B4BA8]/40 bg-white text-[#7B2C8E] hover:border-[#9B4BA8] hover:bg-[#C084CC]/15 hover:text-[#7B2C8E]"
              onClick={() => {
                setApiUrl(DEFAULT_API_URL);
                setUrl(DEFAULT_API_URL);
                void conn.refetch();
              }}
            >
              {t("reset_default")}
            </Button>

          </div>
        </Card>

        {/* =====================================================
            SYSTEM HEALTH
        ====================================================== */}

        <Card className="overflow-hidden border border-[#9B4BA8]/25 bg-gradient-to-br from-white via-[#faf5fc] to-[#f3e5f5] shadow-sm transition-all duration-300 hover:border-[#9B4BA8]/60 hover:shadow-md">

          <div className="border-b border-[#9B4BA8]/20 bg-gradient-to-r from-[#7B2C8E]/10 via-[#9B4BA8]/10 to-[#C084CC]/15 p-5">

            <div className="flex flex-wrap items-center gap-3">

              <div>
                <h2 className="text-lg font-bold text-[#7B2C8E]">
                  {t("system_health")}
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  حالة الاتصال وقواعد البيانات
                </p>
              </div>

              {conn.isSuccess && (
                <Badge className="border border-green-200 bg-green-50 text-green-700">
                  {t("connected")}
                </Badge>
              )}

              {conn.isError && (
                <Badge className="border border-red-200 bg-red-50 text-red-700">
                  {t("connection_failed")}
                </Badge>
              )}

              <Button
                size="sm"
                variant="outline"
                className="ms-auto border-[#9B4BA8]/40 bg-white text-[#7B2C8E] hover:border-[#9B4BA8] hover:bg-[#C084CC]/15 hover:text-[#7B2C8E]"
                onClick={() =>
                  void conn.refetch()
                }
                disabled={conn.isFetching}
              >
                {conn.isFetching
                  ? t("loading")
                  : t("test_connection")}
              </Button>

            </div>

          </div>

          <div className="space-y-5 p-5">

            <div className="rounded-xl border border-[#9B4BA8]/20 bg-white p-4 shadow-sm">

              <p
                className="break-all text-xs text-[#7B2C8E]/70"
                dir="ltr"
              >
                {getApiUrl()}
              </p>

            </div>

            {conn.isError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  {errorMessage(
                    conn.error,
                    lang,
                  )}
                </p>
              </div>
            )}

            {conn.isLoading && (
              <div className="rounded-xl border border-[#9B4BA8]/20 bg-[#faf5fc] p-4">
                <p className="text-sm text-[#7B2C8E]">
                  {t("loading")}
                </p>
              </div>
            )}

            {conn.data && (
              <>
                <div className="rounded-xl border border-[#9B4BA8]/25 bg-gradient-to-r from-[#7B2C8E]/10 via-[#9B4BA8]/10 to-[#C084CC]/15 p-4">

                  <p className="text-sm text-gray-600">
                    {t("spreadsheet")}:
                  </p>

                  <strong className="mt-1 block text-lg text-[#7B2C8E]">
                    {conn.data.spreadsheet_name}
                  </strong>

                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

                  {REQUIRED_SHEETS.map(
                    (sheet) => {
                      const info =
                        (
                          conn.data
                            .sheets ?? {}
                        )[sheet];

                      return (
                        <div
                          key={sheet}
                          className="flex items-center justify-between rounded-xl border border-[#9B4BA8]/20 bg-white p-4 shadow-sm transition-all duration-200 hover:border-[#9B4BA8]/60 hover:bg-[#faf5fc] hover:shadow-md"
                        >

                          <div className="min-w-0">
                            <span className="block truncate text-sm font-semibold text-[#7B2C8E]">
                              {sheet}
                            </span>

                            {info?.connected && (
                              <span className="mt-1 block text-xs text-gray-500">
                                {info.rows}{" "}
                                {t("rows")}
                              </span>
                            )}
                          </div>

                          {info?.connected ? (
                            <span className="ms-2 rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700">
                              Connected
                            </span>
                          ) : (
                            <Badge className="ms-2 border border-red-200 bg-red-50 text-red-700">
                              {t("not_connected")}
                            </Badge>
                          )}

                        </div>
                      );
                    },
                  )}

                </div>
              </>
            )}

          </div>
        </Card>

        {/* =====================================================
            BARCODE SETTINGS
        ====================================================== */}

        <Card className="border border-[#9B4BA8]/25 bg-gradient-to-br from-white via-[#faf5fc] to-[#f3e5f5] p-5 shadow-sm transition-all duration-300 hover:border-[#9B4BA8]/60 hover:shadow-md">

          <div className="mb-4">

            <h2 className="text-lg font-bold text-[#7B2C8E]">
              {t("barcode_settings")}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {t("barcode_only_note")}
            </p>

          </div>

          <div className="flex flex-wrap gap-3">

            {LABEL_SIZES.map((s) => (
              <Button
                key={s.key}
                size="sm"
                className={
                  size === s.key
                    ? "border border-[#7B2C8E] bg-gradient-to-r from-[#7B2C8E] to-[#9B4BA8] text-white shadow-md hover:from-[#6f287f] hover:to-[#8d4299]"
                    : "border border-[#9B4BA8]/40 bg-white text-[#7B2C8E] hover:border-[#9B4BA8] hover:bg-[#C084CC]/15 hover:text-[#7B2C8E]"
                }
                onClick={() => {
                  setSize(s.key);
                  setLabelSize(s.key);
                }}
              >
                {s.label}
              </Button>
            ))}

          </div>
        </Card>

        {/* =====================================================
            WAREHOUSE MANAGEMENT
        ====================================================== */}

        <Card className="border border-[#9B4BA8]/25 bg-gradient-to-br from-white via-[#faf5fc] to-[#f3e5f5] p-5 shadow-sm transition-all duration-300 hover:border-[#9B4BA8]/60 hover:shadow-md">

          <div className="mb-4">

            <h2 className="text-lg font-bold text-[#7B2C8E]">
              {t("warehouse_management")}
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              إدارة المستودعات وتنظيم المخزون
            </p>

          </div>

          <Button
            asChild
            variant="outline"
            className="w-fit border-[#9B4BA8]/40 bg-white text-[#7B2C8E] transition-all hover:border-[#9B4BA8] hover:bg-gradient-to-r hover:from-[#7B2C8E]/10 hover:to-[#C084CC]/20 hover:text-[#7B2C8E]"
          >
            <Link to="/warehouses">
              {t("manage_warehouses")}
            </Link>
          </Button>

        </Card>

      </div>
    </AppShell>
  );
}