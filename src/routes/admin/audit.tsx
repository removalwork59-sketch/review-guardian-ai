import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AdminShell } from "@/components/admin-shell";
import { EmptyState, ErrorState, LoadingState, PermissionDenied } from "@/components/case-ui";
import { listAdminAuditLogs } from "@/lib/admin.functions";
import { isForbidden } from "@/lib/errors";

export const Route = createFileRoute("/admin/audit")({
  head: () => ({ meta: [{ title: "Audit log — Super admin" }] }),
  component: AdminAuditPage,
});

function AdminAuditPage() {
  const fetchLogs = useServerFn(listAdminAuditLogs);
  const logs = useQuery({
    queryKey: ["admin-audit"],
    queryFn: () => fetchLogs({ data: { limit: 200 } }),
  });

  return (
    <AdminShell title="Audit log" description="Who did what, and when. Append-only.">
      {logs.isPending ? (
        <LoadingState />
      ) : logs.error ? (
        isForbidden(logs.error) ? (
          <PermissionDenied />
        ) : (
          <ErrorState onRetry={() => void logs.refetch()} />
        )
      ) : !logs.data?.length ? (
        <EmptyState
          title="Nothing logged yet"
          body="Actions such as scans, Google connections and report updates are recorded here."
        />
      ) : (
        <div className="surface overflow-x-auto p-0 md:p-2">
          <table className="rw-table">
            <thead>
              <tr>
                <th scope="col">When</th>
                <th scope="col">Action</th>
                <th scope="col">Entity</th>
                <th scope="col">Actor</th>
                <th scope="col">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.data.map((entry) => (
                <tr key={entry.id}>
                  <td data-label="When">{new Date(entry.created_at).toLocaleString()}</td>
                  <td data-label="Action">{entry.action}</td>
                  <td data-label="Entity" className="break-all text-xs">
                    {entry.entity_type}
                    {entry.entity_id ? ` · ${entry.entity_id}` : ""}
                  </td>
                  <td data-label="Actor" className="break-all text-xs">
                    {entry.actor_id ?? "system"}
                  </td>
                  <td data-label="Details" className="break-all text-xs">
                    {JSON.stringify(entry.metadata)}
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
