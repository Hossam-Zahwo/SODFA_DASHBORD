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
import { DEFAULT_API_URL, api, getApiUrl, setApiUrl } from "@/lib/api";
import { LABEL_SIZES, getLabelSize, setLabelSize, type LabelSizeKey } from "@/lib/labels";
import { errorMessage, useI18n } from "@/lib/i18n";
import { keys } from "@/hooks/useSodfa";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — SODFA صدفة" },
      { name: "description", content: "Check the SODFA Google Sheets connection and sheet status." },
      { property: "og:title", content: "Settings — SODFA صدفة" },
      { property: "og:description", content: "Connection and system health." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang } = useI18n();
  const conn = useQuery({ queryKey: keys.connection, queryFn: api.connection, retry: 1 });
  const [url, setUrl] = useState(() => getApiUrl());
  const [size, setSize] = useState<LabelSizeKey>(() => getLabelSize());

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
      <div className="space-y-5">
        <Card className="space-y-3 p-4">
          <h2 className="font-bold">{t("language")}</h2>
          <div className="flex gap-2">
            <Button variant={lang === "ar" ? "default" : "outline"} onClick={() => setLang("ar")}>
              {t("arabic")}
            </Button>
            <Button variant={lang === "en" ? "default" : "outline"} onClick={() => setLang("en")}>
              {t("english")}
            </Button>
          </div>
        </Card>

        <Card className="space-y-3 p-4">
          <h2 className="font-bold">{t("api_settings")}</h2>
          <div>
            <Label htmlFor="api-url">{t("api_url")}</Label>
            <Input
              id="api-url"
              dir="ltr"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={DEFAULT_API_URL}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => {
                const clean = url.trim();
                if (!/^https:\/\/script\.google\.com\/.+\/exec$/.test(clean)) {
                  toast.error(t("invalid_url"));
                  return;
                }
                setApiUrl(clean);
                toast.success(t("api_url_saved"));
                void conn.refetch();
              }}
            >
              {t("save_api_url")}
            </Button>
            <Button
              variant="outline"
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

        <Card className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <h2 className="font-bold">{t("system_health")}</h2>
            {conn.isSuccess && <Badge>{t("connected")}</Badge>}
            {conn.isError && <Badge variant="destructive">{t("connection_failed")}</Badge>}
            <Button
              size="sm"
              variant="outline"
              className="ms-auto"
              onClick={() => void conn.refetch()}
              disabled={conn.isFetching}
            >
              {conn.isFetching ? t("loading") : t("test_connection")}
            </Button>
          </div>
          <p className="break-all text-xs text-muted-foreground" dir="ltr">
            {getApiUrl()}
          </p>
          {conn.isError && (
            <p className="text-sm text-destructive">{errorMessage(conn.error, lang)}</p>
          )}
          {conn.isLoading && <p className="text-sm text-muted-foreground">{t("loading")}</p>}
          {conn.data && (
            <>
              <p className="text-sm">
                {t("spreadsheet")}: <strong>{conn.data.spreadsheet_name}</strong>
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {REQUIRED_SHEETS.map((sheet) => {
                  const info = (conn.data.sheets ?? {})[sheet];
                  return (
                    <div
                      key={sheet}
                      className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
                    >
                      <span>{sheet}</span>
                      {info?.connected ? (
                        <span className="text-xs text-muted-foreground">
                          {info.rows} {t("rows")}
                        </span>
                      ) : (
                        <Badge variant="destructive">{t("not_connected")}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </Card>

        <Card className="space-y-3 p-4">
          <h2 className="font-bold">{t("barcode_settings")}</h2>
          <p className="text-sm text-muted-foreground">{t("barcode_only_note")}</p>
          <div className="flex flex-wrap gap-2">
            {LABEL_SIZES.map((s) => (
              <Button
                key={s.key}
                size="sm"
                variant={size === s.key ? "default" : "outline"}
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

        <Card className="space-y-3 p-4">
          <h2 className="font-bold">{t("warehouse_management")}</h2>
          <Button asChild variant="outline" className="w-fit">
            <Link to="/warehouses">{t("manage_warehouses")}</Link>
          </Button>
        </Card>
      </div>
    </AppShell>
  );
}