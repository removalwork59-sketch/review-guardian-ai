import type { ComponentProps } from "react";

import { AppShell } from "@/components/app-shell";
import { useWorkspaceSummary } from "@/hooks/use-workspace-summary";

/** AppShell with the server-verified super admin link. */
export function WorkspaceShell(props: Omit<ComponentProps<typeof AppShell>, "admin">) {
  const { data } = useWorkspaceSummary();
  return <AppShell {...props} admin={data?.isSuperadmin ?? false} />;
}
