import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut, ShieldCheck } from "lucide-react";

import { Badge, ErrorState, LoadingState } from "@/components/case-ui";
import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/workspace-shell";
import { useWorkspaceSummary } from "@/hooks/use-workspace-summary";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Removal Work" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const workspace = useWorkspaceSummary();
  const user = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/" });
  }

  return (
    <WorkspaceShell title="Settings" description="Your account and workspace.">
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="surface p-4 sm:p-6">
          <h2 className="rw-section-title">Account</h2>
          <p className="text-sm text-muted-foreground">Signed in as</p>
          <p className="mt-1 break-all font-medium text-ink">{user.data?.email ?? "…"}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => void signOut()}>
              <LogOut className="size-4" aria-hidden="true" /> Sign out
            </Button>
            {workspace.data?.isSuperadmin ? (
              <Button asChild variant="outline">
                <Link to="/admin">
                  <ShieldCheck className="size-4" aria-hidden="true" /> Super admin
                </Link>
              </Button>
            ) : null}
          </div>
        </section>

        <section className="surface p-4 sm:p-6">
          <h2 className="rw-section-title">Workspace</h2>
          {workspace.isPending ? (
            <LoadingState label="Loading workspace…" />
          ) : workspace.error || !workspace.data ? (
            <ErrorState
              body="We couldn't load your workspace."
              onRetry={() => void workspace.refetch()}
            />
          ) : (
            <>
              <p className="font-medium text-ink">{workspace.data.name}</p>
              <p className="mt-1 text-sm text-muted-foreground">Your role: {workspace.data.role}</p>
              <h3 className="mt-5 text-sm font-semibold text-ink">Members</h3>
              <ul className="mt-2 grid gap-2">
                {workspace.data.members.map((member) => (
                  <li
                    key={member.userId}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 break-all text-foreground">
                      {member.name || member.email || "Member"}
                      {member.isYou ? " (you)" : ""}
                    </span>
                    <Badge tone="neutral">{member.role}</Badge>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>
    </WorkspaceShell>
  );
}
