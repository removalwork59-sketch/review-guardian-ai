import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CaseCard, EmptyState } from "@/components/case-ui";
import { Button } from "@/components/ui/button";
import { deleteCase, listCases, updateCaseStatus } from "@/lib/cases.functions";
import type { CaseRecord, CaseStatus } from "@/lib/case-types";
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
  const [filter, setFilter] = useState<string>("all");
  const [siteFilter, setSiteFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const cases: CaseRecord[] = data ?? [];
  const sites = Array.from(new Set(cases.map((item) => item.locationName))).sort();
  const shown = cases
    .filter((item) => filter === "all" || item.verdict === filter)
    .filter((item) => siteFilter === "all" || item.locationName === siteFilter)
    .filter((item) => statusFilter === "all" || item.status === statusFilter);

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
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">Export history</h2>
          <Button asChild variant="outline" size="sm">
            <Link to="/scans">Go to scan reports</Link>
          </Button>
        </div>
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
                className="app-card flex flex-col gap-2 rounded-2xl border border-border bg-card p-4"
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
