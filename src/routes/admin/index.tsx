import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import { Badge, ErrorState, LoadingState, PermissionDenied } from "@/components/case-ui";
import { Button } from "@/components/ui/button";
import { getAdminOverview } from "@/lib/admin.functions";
import { isForbidden } from "@/lib/errors";

export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "System — Super admin" }] }),
  component: AdminSystemPage,
});

const STATUS_TONE: Record<string, string> = {
  ok: "safe",
  degraded: "warning",
  down: "danger",
  not_configured: "neutral",
};

function AdminSystemPage() {
  const fetchOverview = useServerFn(getAdminOverview);
  const [refresh, setRefresh] = useState(false);
  const overview = useQuery({
    queryKey: ["admin-overview", refresh],
    queryFn: () => fetchOverview({ data: { refresh } }),
    refetchInterval: 60_000,
  });
  const data = overview.data;
  const database = (data?.database ?? {}) as Record<string, unknown>;

  return (
    <AdminShell
      title="System health"
      description="Live integration status, pipeline load and production activity. No secrets are ever shown."
      actions={
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setRefresh(true);
            void overview.refetch();
          }}
          disabled={overview.isFetching}
        >
          <RefreshCw
            className={`size-4 ${overview.isFetching ? "animate-spin" : ""}`}
            aria-hidden="true"
          />{" "}
          Re-check
        </Button>
      }
    >
      {overview.isPending ? (
        <LoadingState label="Checking the system…" />
      ) : overview.error ? (
        isForbidden(overview.error) ? (
          <PermissionDenied body="Only the platform super admin can see this page." />
        ) : (
          <ErrorState
            body="The system overview didn't load."
            error={overview.error}
            onRetry={() => void overview.refetch()}
          />
        )
      ) : data ? (
        <div className="grid gap-4">
          <section className="surface p-4 sm:p-6">
            <h2 className="rw-section-title">Integrations</h2>
            <ul className="grid gap-3">
              {data.integrations.map((check) => (
                <li
                  key={check.name}
                  className="flex flex-wrap items-start justify-between gap-2 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{check.name}</p>
                    <p className="text-sm text-muted-foreground">{check.detail}</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {check.latencyMs !== null ? `${check.latencyMs} ms` : null}
                    <Badge tone={STATUS_TONE[check.status] ?? "neutral"}>
                      {check.status.replace("_", " ")}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="surface p-4 sm:p-6">
              <h2 className="rw-section-title">Application</h2>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <Fact label="Build" value={data.app.build} />
                <Fact label="Commit" value={data.app.commit} />
                <Fact label="Uptime" value={`${Math.round(data.app.uptimeSeconds / 60)} min`} />
                <Fact label="Node" value={data.app.node} />
                <Fact
                  label="Pipeline running"
                  value={`${data.app.pipeline.active} / ${data.app.pipeline.concurrency}`}
                />
                <Fact label="Pipeline waiting" value={String(data.app.pipeline.waiting)} />
              </dl>
            </section>
            <section className="surface p-4 sm:p-6">
              <h2 className="rw-section-title">Configuration present</h2>
              <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                {Object.entries(data.configuration).map(([key, present]) => (
                  <li key={key} className="flex items-center justify-between gap-2">
                    <span className="text-foreground">{key}</span>
                    <Badge tone={present ? "safe" : "warning"}>{present ? "set" : "missing"}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="surface p-4 sm:p-6">
            <h2 className="rw-section-title">Activity (database)</h2>
            {data.databaseError ? (
              <p className="text-sm text-danger">{data.databaseError}</p>
            ) : (
              <dl className="grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                <Fact label="Workspaces" value={String(database["workspaces"] ?? 0)} />
                <Fact label="Members" value={String(database["members"] ?? 0)} />
                <Fact label="Stuck jobs" value={String(database["jobs_stuck"] ?? 0)} />
                <Fact label="Failed jobs (24h)" value={String(database["jobs_failed_24h"] ?? 0)} />
                <Fact
                  label="Median scan (24h)"
                  value={
                    database["scan_seconds_p50_24h"]
                      ? `${Number(database["scan_seconds_p50_24h"]).toFixed(1)} s`
                      : "—"
                  }
                />
                <Fact label="AI runs (24h)" value={JSON.stringify(database["ai_runs_24h"] ?? {})} />
                <Fact
                  label="Jobs by status (24h)"
                  value={JSON.stringify(database["jobs_24h"] ?? {})}
                />
                <Fact label="Reports by status" value={JSON.stringify(database["reports"] ?? {})} />
              </dl>
            )}
          </section>
        </div>
      ) : null}
    </AdminShell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words font-medium text-ink">{value}</dd>
    </div>
  );
}
