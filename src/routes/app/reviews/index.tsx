import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus, Upload } from "lucide-react";
import { useState } from "react";

import { CaseCard, EmptyState, ErrorState, LoadingState } from "@/components/case-ui";
import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/workspace-shell";
import { useCases } from "@/hooks/use-cases";
import type { CaseRecord } from "@/lib/case-types";
import { listRecentReviewJobs } from "@/lib/review-jobs.functions";
import { JOB_ACTIVE_STATUSES, JOB_STATUS_LABELS } from "@/lib/state-machines";

export const Route = createFileRoute("/app/reviews/")({
  head: () => ({ meta: [{ title: "Reviews — Removal Work" }] }),
  component: ReviewsPage,
});

const FILTERS = [
  { id: "all", label: "All" },
  { id: "reportable", label: "Worth reporting" },
  { id: "needs_human_review", label: "Needs your eyes" },
  { id: "not_reportable", label: "No violation" },
  { id: "dismissed", label: "Dismissed" },
] as const;

function matches(item: CaseRecord, filter: string) {
  if (filter === "dismissed") return item.dismissed;
  if (item.dismissed) return false;
  return filter === "all" || item.decision === filter;
}

function ReviewsPage() {
  const cases = useCases();
  const fetchJobs = useServerFn(listRecentReviewJobs);
  const jobs = useQuery({
    queryKey: ["review-jobs"],
    queryFn: () => fetchJobs({ data: undefined }),
    refetchInterval: (state) =>
      (state.state.data ?? []).some((job) => JOB_ACTIVE_STATUSES.includes(job.status))
        ? 4_000
        : false,
  });
  const [filter, setFilter] = useState<string>("all");

  const all = cases.data ?? [];
  const shown = all.filter((item) => matches(item, filter));
  const pending = (jobs.data ?? []).filter(
    (job) =>
      JOB_ACTIVE_STATUSES.includes(job.status) ||
      job.status === "awaiting_selection" ||
      (job.status === "failed" &&
        Date.now() - new Date(job.updatedAt).getTime() < 24 * 60 * 60_000),
  );

  return (
    <WorkspaceShell
      title="Reviews"
      description="Every review you've checked, with the AI decision and where the report stands."
      actions={
        <>
          <Button asChild variant="outline">
            <Link to="/app/bulk">
              <Upload className="size-4" aria-hidden="true" />
              Bulk scan
            </Link>
          </Button>
          <Button asChild className="max-md:hidden">
            <Link to="/app/reviews/new">
              <Plus className="size-4" aria-hidden="true" />
              Add review
            </Link>
          </Button>
        </>
      }
    >
      {pending.length > 0 ? (
        <section className="mb-6" aria-label="Scans in progress">
          <h2 className="rw-section-title">In progress</h2>
          <ul className="grid gap-2">
            {pending.map((job) => (
              <li key={job.id}>
                <Link
                  to="/app/reviews/new"
                  search={{ job: job.id }}
                  className="surface surface-hover flex items-center justify-between gap-3 p-3.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      {job.business?.name ?? job.sourceUrl}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {job.detail}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold text-primary">
                    {JOB_ACTIVE_STATUSES.includes(job.status) ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : null}
                    {JOB_STATUS_LABELS[job.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="app-filter-row" role="group" aria-label="Filter reviews">
        {FILTERS.map((item) => {
          const count = all.filter((row) => matches(row, item.id)).length;
          return (
            <Button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              variant="outline"
              size="sm"
              aria-pressed={filter === item.id}
              className={`min-h-9 rounded-full ${
                filter === item.id
                  ? "border-primary bg-info-soft text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-ink"
              }`}
            >
              {item.label}
              <span className="ml-1.5 text-xs opacity-70">{count}</span>
            </Button>
          );
        })}
      </div>

      {cases.isPending ? (
        <LoadingState label="Loading your reviews…" />
      ) : cases.error ? (
        <ErrorState body="We couldn't load your reviews." onRetry={() => void cases.refetch()} />
      ) : shown.length === 0 ? (
        <EmptyState
          title={all.length === 0 ? "No reviews checked yet" : "Nothing in this filter"}
          body={
            all.length === 0
              ? "Paste a Google review link and everything else happens automatically."
              : "Try another filter to see your other results."
          }
          action={
            all.length === 0 ? (
              <Button asChild>
                <Link to="/app/reviews/new">
                  <Plus className="size-4" aria-hidden="true" />
                  Add review
                </Link>
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="rw-card-grid">
          {shown.map((item) => (
            <CaseCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}
