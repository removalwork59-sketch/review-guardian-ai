import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";

import { AdminShell } from "@/components/admin-shell";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  PermissionDenied,
} from "@/components/case-ui";
import { Button } from "@/components/ui/button";
import { listAdminJobs, retryAdminJob } from "@/lib/admin.functions";
import { JOB_STATUS_LABELS, REVIEW_JOB_STATUSES } from "@/lib/state-machines";
import type { ReviewJobStatus } from "@/lib/state-machines";
import { isForbidden } from "@/lib/errors";

export const Route = createFileRoute("/admin/jobs")({
  head: () => ({ meta: [{ title: "Jobs — Super admin" }] }),
  component: AdminJobsPage,
});

function AdminJobsPage() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const fetchJobs = useServerFn(listAdminJobs);
  const retry = useServerFn(retryAdminJob);
  const jobs = useQuery({
    queryKey: ["admin-jobs", status],
    queryFn: () => fetchJobs({ data: { limit: 100, ...(status ? { status } : {}) } }),
    refetchInterval: 15_000,
  });

  return (
    <AdminShell
      title="Review jobs"
      description="Every scan across all workspaces, newest first."
      actions={
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="app-select min-h-10"
          >
            <option value="">All</option>
            {REVIEW_JOB_STATUSES.map((value) => (
              <option key={value} value={value}>
                {JOB_STATUS_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      }
    >
      {jobs.isPending ? (
        <LoadingState />
      ) : jobs.error ? (
        isForbidden(jobs.error) ? (
          <PermissionDenied />
        ) : (
          <ErrorState error={jobs.error} onRetry={() => void jobs.refetch()} />
        )
      ) : !jobs.data?.length ? (
        <EmptyState title="No jobs" body="No review jobs match this filter." />
      ) : (
        <div className="surface overflow-x-auto p-0 md:p-2">
          <table className="rw-table">
            <thead>
              <tr>
                <th scope="col">Created</th>
                <th scope="col">Workspace</th>
                <th scope="col">Status</th>
                <th scope="col">Detail</th>
                <th scope="col">Attempts</th>
                <th scope="col">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.data.map((job) => (
                <tr key={job.id}>
                  <td data-label="Created">{new Date(job.created_at).toLocaleString()}</td>
                  <td data-label="Workspace">
                    {(job.workspaces as { name?: string } | null)?.name ?? job.workspace_id}
                  </td>
                  <td data-label="Status">
                    <Badge
                      tone={
                        job.status === "failed"
                          ? "warning"
                          : job.status === "report_ready"
                            ? "danger"
                            : "info"
                      }
                    >
                      {JOB_STATUS_LABELS[job.status as ReviewJobStatus] ?? job.status}
                    </Badge>
                  </td>
                  <td data-label="Detail">
                    {job.detail}
                    {job.error_code ? (
                      <span className="block text-xs text-muted-foreground">{job.error_code}</span>
                    ) : null}
                  </td>
                  <td data-label="Attempts">
                    {job.attempt_count}/{job.max_attempts}
                  </td>
                  <td data-label="Actions">
                    {job.status === "failed" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={busy === job.id}
                        onClick={async () => {
                          setBusy(job.id);
                          await retry({ data: { jobId: job.id } }).catch(() => undefined);
                          setBusy(null);
                          void jobs.refetch();
                        }}
                      >
                        Retry
                      </Button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
