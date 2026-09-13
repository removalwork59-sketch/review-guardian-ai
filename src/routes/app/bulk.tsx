import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, RefreshCw, Search, XCircle } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge, EmptyState } from "@/components/case-ui";
import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  cancelBulkJob,
  createBulkJob,
  getLatestBulkJob,
  MAX_BULK_URLS,
  retryFailedBulkItems,
} from "@/lib/bulk.functions";
import type { BulkJob } from "@/lib/bulk.functions";
import { parseUrlList } from "@/lib/case-types";
import { JOB_STATUS_LABELS } from "@/lib/state-machines";

export const Route = createFileRoute("/app/bulk")({
  head: () => ({ meta: [{ title: "Bulk scan — Removal Work" }] }),
  component: BulkPage,
});

const TONE: Record<string, string> = {
  report_ready: "danger",
  needs_human_review: "info",
  completed: "safe",
  failed: "warning",
  cancelled: "neutral",
  awaiting_selection: "warning",
};

function BulkPage() {
  const queryClient = useQueryClient();
  const create = useServerFn(createBulkJob);
  const fetchLatest = useServerFn(getLatestBulkJob);
  const cancel = useServerFn(cancelBulkJob);
  const retry = useServerFn(retryFailedBulkItems);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const preview = useMemo(() => parseUrlList(text), [text]);
  const valid = preview.filter((row) => row.valid).length;

  const latest = useQuery({
    queryKey: ["bulk-latest"],
    queryFn: () => fetchLatest({ data: undefined }),
    refetchInterval: (state) => (state.state.data?.status === "running" ? 4_000 : false),
  });
  const job = latest.data ?? null;

  async function run(action: () => Promise<BulkJob>) {
    setBusy(true);
    setError(null);
    try {
      queryClient.setQueryData(["bulk-latest"], await action());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "That didn't work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceShell
      title="Bulk scan"
      description="Paste several Google links. Each one is scanned independently, so one failure never stops the rest."
    >
      <form
        className="surface p-4 sm:p-6"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            const created = await create({ data: { text } });
            setText("");
            return created;
          });
        }}
      >
        <label htmlFor="bulk-links" className="text-sm font-semibold text-ink">
          Google review or business links
        </label>
        <p className="mt-1 text-sm text-muted-foreground">
          One per line, up to {MAX_BULK_URLS}. Duplicates are removed.
        </p>
        <textarea
          id="bulk-links"
          rows={6}
          value={text}
          onChange={(event) => setText(event.target.value)}
          className="app-textarea mt-3 font-mono"
          placeholder={"https://maps.app.goo.gl/…\nhttps://www.google.com/maps/place/…"}
        />
        {error ? (
          <p role="alert" className="mt-3 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {preview.length
              ? `${valid} valid · ${preview.length - valid} skipped`
              : "No links added yet."}
          </p>
          <Button type="submit" disabled={busy || valid === 0}>
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="size-4" aria-hidden="true" />
            )}
            Scan {valid || ""} link{valid === 1 ? "" : "s"}
          </Button>
        </div>
      </form>

      {job ? (
        <section className="mt-6" aria-label="Latest bulk scan">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h2 className="rw-section-title mb-0">
              Latest scan · {job.items.length} link{job.items.length === 1 ? "" : "s"} ·{" "}
              {job.status === "running" ? "running" : job.status}
            </h2>
            <div className="flex flex-wrap gap-2">
              {job.items.some((item) => item.canRetry) ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busy}
                  onClick={() => void run(() => retry({ data: { bulkJobId: job.id } }))}
                >
                  <RefreshCw className="size-4" aria-hidden="true" /> Retry failed
                </Button>
              ) : null}
              {job.status === "running" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => void run(() => cancel({ data: { bulkJobId: job.id } }))}
                >
                  <XCircle className="size-4" aria-hidden="true" /> Cancel
                </Button>
              ) : null}
            </div>
          </div>
          <div className="surface overflow-x-auto p-0 md:p-2">
            <table className="rw-table">
              <thead>
                <tr>
                  <th scope="col">Link</th>
                  <th scope="col">Business</th>
                  <th scope="col">Status</th>
                  <th scope="col">Detail</th>
                </tr>
              </thead>
              <tbody>
                {job.items.map((item) => (
                  <tr key={item.id}>
                    <td
                      data-label="Link"
                      className="max-w-[16rem] truncate md:max-w-[20rem]"
                      title={item.sourceUrl}
                    >
                      {item.sourceUrl}
                    </td>
                    <td data-label="Business">{item.businessName ?? "—"}</td>
                    <td data-label="Status">
                      <Badge tone={TONE[item.status] ?? "info"}>
                        {JOB_STATUS_LABELS[item.status]}
                      </Badge>
                    </td>
                    <td data-label="Detail">
                      {item.caseId ? (
                        <Link
                          to="/app/reviews/$caseId"
                          params={{ caseId: item.caseId }}
                          className="font-medium text-primary hover:underline"
                        >
                          Open result
                        </Link>
                      ) : item.status === "awaiting_selection" && item.jobId ? (
                        <Link
                          to="/app/reviews/new"
                          search={{ job: item.jobId }}
                          className="font-medium text-primary hover:underline"
                        >
                          Pick the review
                        </Link>
                      ) : (
                        item.detail
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : latest.isPending ? null : (
        <div className="mt-6">
          <EmptyState
            title="No bulk scans yet"
            body="Paste a few links above to scan them all at once."
          />
        </div>
      )}
    </WorkspaceShell>
  );
}
