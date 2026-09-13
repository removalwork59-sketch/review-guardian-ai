import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { AdminShell } from "@/components/admin-shell";
import { Badge, ErrorState, LoadingState, PermissionDenied } from "@/components/case-ui";
import { listAdminUsers, listAdminWorkspaces } from "@/lib/admin.functions";
import { isForbidden } from "@/lib/errors";

export const Route = createFileRoute("/admin/users")({
  head: () => ({ meta: [{ title: "Users — Super admin" }] }),
  component: AdminUsersPage,
});

function count(value: unknown) {
  return Array.isArray(value)
    ? Number((value[0] as { count?: number } | undefined)?.count ?? 0)
    : 0;
}

function AdminUsersPage() {
  const fetchUsers = useServerFn(listAdminUsers);
  const fetchWorkspaces = useServerFn(listAdminWorkspaces);
  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => fetchUsers({ data: undefined }),
  });
  const workspaces = useQuery({
    queryKey: ["admin-workspaces"],
    queryFn: () => fetchWorkspaces({ data: undefined }),
  });
  const error = users.error ?? workspaces.error;

  return (
    <AdminShell
      title="Users & workspaces"
      description="Accounts, platform roles and workspace memberships."
    >
      {users.isPending || workspaces.isPending ? (
        <LoadingState />
      ) : error ? (
        isForbidden(error) ? (
          <PermissionDenied />
        ) : (
          <ErrorState
            onRetry={() => {
              void users.refetch();
              void workspaces.refetch();
            }}
          />
        )
      ) : (
        <div className="grid gap-6">
          <section>
            <h2 className="rw-section-title">Workspaces ({workspaces.data?.length ?? 0})</h2>
            <div className="surface overflow-x-auto p-0 md:p-2">
              <table className="rw-table">
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Members</th>
                    <th scope="col">Reviews</th>
                    <th scope="col">Reports</th>
                    <th scope="col">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(workspaces.data ?? []).map((workspace) => (
                    <tr key={workspace.id}>
                      <td data-label="Name">
                        {workspace.name}
                        {workspace.deleted_at ? <Badge tone="neutral">deleted</Badge> : null}
                      </td>
                      <td data-label="Members">{count(workspace.workspace_members)}</td>
                      <td data-label="Reviews">{count(workspace.review_cases)}</td>
                      <td data-label="Reports">{count(workspace.reports)}</td>
                      <td data-label="Created">
                        {new Date(workspace.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="rw-section-title">Users ({users.data?.length ?? 0})</h2>
            <div className="surface overflow-x-auto p-0 md:p-2">
              <table className="rw-table">
                <thead>
                  <tr>
                    <th scope="col">Email</th>
                    <th scope="col">Platform role</th>
                    <th scope="col">Workspaces</th>
                    <th scope="col">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {(users.data ?? []).map((user) => (
                    <tr key={user.id}>
                      <td data-label="Email" className="break-all">
                        {user.email ?? user.name ?? user.id}
                      </td>
                      <td data-label="Platform role">
                        {user.platformRoles.length
                          ? user.platformRoles.map((role) => (
                              <Badge
                                key={role}
                                tone={role === "superadmin" ? "warning" : "neutral"}
                              >
                                {role}
                              </Badge>
                            ))
                          : "—"}
                      </td>
                      <td data-label="Workspaces">
                        {user.workspaces
                          .map((workspace) => `${workspace.name} (${workspace.role})`)
                          .join(", ") || "—"}
                      </td>
                      <td data-label="Joined">{new Date(user.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
