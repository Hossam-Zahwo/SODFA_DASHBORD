import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { API_URL, api } from "@/lib/api";
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
  const { t, lang } = useI18n();
  const conn = useQuery({ queryKey: keys.connection, queryFn: api.connection, retry: 1 });

  return (
    <AppShell title={t("settings")}>
      <div className="space-y-5">
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
          <p className="break-all text-xs text-muted-foreground">
            {t("api_url")}: {API_URL}
          </p>
          {conn.isError && (
            <p className="text-sm text-destructive">{errorMessage(conn.error, lang)}</p>
          )}
          {conn.data && (
            <>
              <p className="text-sm">
                {t("spreadsheet")}: <strong>{conn.data.spreadsheet_name}</strong>
              </p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(conn.data.sheets ?? {}).map(([sheet, info]) => (
                  <div
                    key={sheet}
                    className="flex items-center justify-between rounded-lg bg-surface px-3 py-2 text-sm"
                  >
                    <span>{sheet}</span>
                    <span className="text-xs text-muted-foreground">
                      {info.rows} {t("rows")}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>
    </AppShell>
  );
}