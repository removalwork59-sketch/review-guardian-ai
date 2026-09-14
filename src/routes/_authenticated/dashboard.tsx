import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CaseCard, EmptyState } from "@/components/case-ui";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { deleteCase, listCases, updateCaseStatus } from "@/lib/cases.functions";
import type { CaseRecord, CaseStatus } from "@/lib/case-types";
import { countContactMessages } from "@/lib/metrics.functions";
import { listScanExports } from "@/lib/scan-export.functions";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Reviews — Removal Work" },
      { name: "description", content: "Every review you've checked, with its result and status." },
      { property: "og:title", content: "Reviews — Removal Work" },
      {
        property: "og:description",
        content: "Every review you've checked, with its result and status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewsPage,
});

const FILTERS = [
  { id: "all", label: "All" },
  { id: "strong_candidate", label: "Strong cases" },
  { id: "possible_candidate", label: "Possible" },
  { id: "needs_human_review", label: "Needs your eyes" },
  { id: "not_reportable", label: "No violation" },
] as const;

export function useCases() {
  const fetchCases = useServerFn(listCases);
  return useQuery({ queryKey: ["cases"], queryFn: () => fetchCases({ data: undefined }) });
}

export function useStatusMutation() {
  const queryClient = useQueryClient();
  const update = useServerFn(updateCaseStatus);
  return useMutation({
    mutationFn: (input: { id: string; status: CaseStatus; note?: string }) => update({ data: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cases"] });
      void queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useDeleteCaseMutation() {
  const queryClient = useQueryClient();
  const remove = useServerFn(deleteCase);
  return useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cases"] });
      void queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useScanExports() {
  const fetchExports = useServerFn(listScanExports);
  return useQuery({
    queryKey: ["scan-exports"],
    queryFn: () => fetchExports({ data: undefined }),
  });
}

export function useContactMessageCount() {
  const fetchCount = useServerFn(countContactMessages);
  return useQuery({
    queryKey: ["contact-message-count"],
    queryFn: () => fetchCount({ data: undefined }),
  });
}

/**
 * Keeps the dashboard counters live. Realtime only delivers rows the signed-in
 * user is allowed to read, so this adds no new data exposure.
 */
export function useLiveDashboardData() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ["cases"] });
      void queryClient.invalidateQueries({ queryKey: ["scan-exports"] });
      void queryClient.invalidateQueries({ queryKey: ["contact-message-count"] });
    };
    const channel = supabase
      .channel("dashboard-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "review_cases" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "scan_exports" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "contact_messages" }, refresh)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);
}

/** Groups exports into the last 14 days for the history chart. */
function exportsByDay(rows: { createdAt: string }[]) {
  const days: { key: string; label: string; count: number }[] = [];
  for (let index = 13; index >= 0; index -= 1) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - index);
    days.push({
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
      count: 0,
    });
  }
  for (const row of rows) {
    const key = new Date(row.createdAt).toISOString().slice(0, 10);
    const day = days.find((item) => item.key === key);
    if (day) day.count += 1;
  }
  return days;
}

const STATUS_FILTERS: { value: "all" | CaseStatus; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "reported", label: "I reported it" },
  { value: "pending", label: "Awaiting outcome" },
  { value: "removed", label: "Confirmed removed" },
  { value: "rejected", label: "Kept by Google" },
  { value: "ignored", label: "Ignore" },
];

function ReviewsPage() {
  const { data, isPending, error } = useCases();
  const status = useStatusMutation();
  const removeCase = useDeleteCaseMutation();
  const { data: exportsData, isPending: exportsPending } = useScanExports();
  const { data: messageCount } = useContactMessageCount();
  const [filter, setFilter] = useState<string>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useLiveDashboardData();

  const cases: CaseRecord[] = data ?? [];
  const sites = Array.from(new Set(cases.map((item) => item.locationName))).sort();
  const shown = cases
    .filter((item) => filter === "all" || item.verdict === filter)
    .filter((item) => siteFilter === "all" || item.locationName === siteFilter)
    .filter((item) => statusFilter === "all" || item.status === statusFilter);

  const pendingCount = cases.filter((item) =>
    ["new", "reported", "pending"].includes(item.status),
  ).length;
  const chart = exportsByDay(exportsData ?? []);
  const chartMax = Math.max(1, ...chart.map((day) => day.count));

  return (
    <AppShell
      title="Reviews"
      description="Every review you've checked, newest first."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href="/#scan">Add review</a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/scans">Scan reports</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/bulk">Bulk scan</Link>
          </Button>
        </div>
      }
    >
      <div className="app-stats-grid mb-6">
        <div className="stat-tile">
          <span className="stat-tile-label">Total scans</span>
          <span className="stat-tile-value text-ink">{cases.length}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Pending reviews</span>
          <span className="stat-tile-value text-ink">{pendingCount}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">PDF exports</span>
          <span className="stat-tile-value text-ink">{exportsData?.length ?? 0}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">
            {messageCount?.allowed ? "Contact messages" : "Contact messages (admins only)"}
          </span>
          <span className="stat-tile-value text-ink">
            {messageCount?.allowed ? messageCount.total : "—"}
          </span>
          {messageCount?.allowed && messageCount.unread > 0 ? (
            <span className="mt-1 text-xs text-primary">{messageCount.unread} unread</span>
          ) : null}
        </div>
      </div>

      <div className="app-filter-row">
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            variant="outline"
            size="sm"
            className={`rounded-full ${
              filter === item.id
                ? "border-primary bg-info-soft text-primary"
                : "border-border bg-card text-muted-foreground hover:text-ink"
            }`}
          >
            {item.label}
            {item.id !== "all" ? (
              <span className="ml-1.5 text-xs opacity-70">
                {cases.filter((c) => c.verdict === item.id).length}
              </span>
            ) : null}
          </Button>
        ))}
        <select
          aria-label="Filter by site"
          className="app-input w-auto min-w-40 text-xs"
          value={siteFilter}
          onChange={(event) => setSiteFilter(event.target.value)}
        >
          <option value="all">All sites</option>
          {sites.map((site) => (
            <option key={site} value={site}>
              {site}
            </option>
          ))}
        </select>
        <select
          aria-label="Filter by status"
          className="app-input w-auto min-w-40 text-xs"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {isPending ? (
        <EmptyState title="Loading your reviews…" body="One moment." />
      ) : error ? (
        <EmptyState
          title="We couldn't load your reviews"
          body="Please refresh the page and try again."
        />
      ) : shown.length === 0 ? (
        <EmptyState
          title={cases.length === 0 ? "No reviews checked yet" : "Nothing in this filter"}
          body={
            cases.length === 0
              ? "Scan a review link on the home page, or paste a whole list on the bulk scan screen."
              : "Try another filter to see your other results."
          }
        />
      ) : (
        <div className="app-list-grid">
          {shown.map((item) => (
            <CaseCard
              key={item.id}
              item={item}
              busy={status.isPending || removeCase.isPending}
              onStatusChange={(next) => status.mutate({ id: item.id, status: next })}
              onNoteSave={(note) => status.mutate({ id: item.id, status: item.status, note })}
              onDelete={() => removeCase.mutate(item.id)}
            />
          ))}
        </div>
      )}

      <section className="mt-10">
        <div className="mb-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
          <h2 className="truncate text-lg font-bold text-ink">Export history</h2>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link to="/scans">Go to scan reports</Link>
          </Button>
        </div>

        {exportsData?.length ? (
          <figure className="app-card mb-4 rounded-2xl border border-border bg-card">
            <figcaption className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              PDF exports — last 14 days
            </figcaption>
            <div className="mt-4 flex h-32 items-end gap-1.5">
              {chart.map((day) => (
                <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] text-muted-foreground">
                    {day.count > 0 ? day.count : ""}
                  </span>
                  <div
                    className="w-full rounded-t-md bg-primary/70"
                    style={{ height: `${Math.max(4, (day.count / chartMax) * 92)}%` }}
                    title={`${day.label}: ${day.count} export${day.count === 1 ? "" : "s"}`}
                  />
                  <span className="w-full truncate text-center text-[9px] text-muted-foreground">
                    {day.label}
                  </span>
                </div>
              ))}
            </div>
          </figure>
        ) : null}
        {exportsPending ? (
          <p className="text-sm text-muted-foreground">Loading export history…</p>
        ) : !exportsData?.length ? (
          <EmptyState
            title="No exports yet"
            body="Open a scan report and click Export PDF to build a downloadable report."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {exportsData.map((exp) => (
              <article
                key={exp.id}
                className="app-card flex min-w-0 flex-col gap-2 break-words rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start gap-3">
                  <span className="rounded-lg bg-info-soft p-2 text-primary">
                    <FileDown className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{exp.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {exp.locationName} · {new Date(exp.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Size: {(exp.fileSize / 1024).toFixed(1)} KB
                </p>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
