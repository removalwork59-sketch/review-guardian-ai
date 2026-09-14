import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AdminShell } from "@/components/admin-shell";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  PermissionDenied,
} from "@/components/case-ui";
import { listAdminAiRuns } from "@/lib/admin.functions";
import { isForbidden } from "@/lib/errors";

export const Route = createFileRoute("/admin/ai")({
  head: () => ({ meta: [{ title: "AI runs — Super admin" }] }),
  component: AdminAiPage,
});

function AdminAiPage() {
  const fetchRuns = useServerFn(listAdminAiRuns);
  const runs = useQuery({
    queryKey: ["admin-ai-runs"],
    queryFn: () => fetchRuns({ data: { limit: 150 } }),
    refetchInterval: 30_000,
  });

  return (
    <AdminShell
      title="AI runs"
      description="Every model call: stage, model, prompt and policy version, latency and outcome."
    >
      {runs.isPending ? (
        <LoadingState />
      ) : runs.error ? (
        isForbidden(runs.error) ? (
          <PermissionDenied />
        ) : (
          <ErrorState error={runs.error} onRetry={() => void runs.refetch()} />
        )
      ) : !runs.data?.length ? (
        <EmptyState title="No AI runs yet" body="Runs appear here once reviews are analyzed." />
      ) : (
        <div className="surface overflow-x-auto p-0 md:p-2">
          <table className="rw-table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Stage</th>
                <th scope="col">Model</th>
                <th scope="col">Versions</th>
                <th scope="col">Latency</th>
                <th scope="col">Outcome</th>
              </tr>
            </thead>
            <tbody>
              {runs.data.map((run) => (
                <tr key={run.id}>
                  <td data-label="When">{new Date(run.created_at).toLocaleString()}</td>
                  <td data-label="Stage">{run.stage.replace(/_/g, " ")}</td>
                  <td data-label="Model">
                    {run.provider} · {run.model}
                  </td>
                  <td data-label="Versions" className="text-xs">
                    {run.prompt_version}
                    <br />
                    {run.policy_version}
                  </td>
                  <td data-label="Latency">{(run.duration_ms / 1000).toFixed(1)} s</td>
                  <td data-label="Outcome">
                    <Badge tone={run.status === "completed" ? "safe" : "danger"}>
                      {run.status === "completed"
                        ? `${run.confidence ?? "—"}%`
                        : (run.error_code ?? "failed")}
                    </Badge>
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
