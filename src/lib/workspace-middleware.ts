import { createMiddleware } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

const ROLE_RANK: Record<WorkspaceRole, number> = { owner: 4, admin: 3, member: 2, viewer: 1 };

export class ForbiddenError extends Error {
  readonly status = 403;
}

export function hasWorkspaceRole(role: WorkspaceRole, minimum: WorkspaceRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function assertWorkspaceRole(role: WorkspaceRole, minimum: WorkspaceRole) {
  if (!hasWorkspaceRole(role, minimum)) {
    throw new ForbiddenError("You don't have permission to do that in this workspace.");
  }
}

/**
 * Session → user → workspace membership → role, resolved on the server for every call.
 * Signs the user into their personal workspace on first use.
 */
export const requireWorkspace = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data: workspaceId, error } = await context.supabase.rpc("ensure_my_workspace");
    if (error || !workspaceId) {
      console.error(
        "[workspace] could not resolve workspace",
        error?.code ?? "",
        error?.message ?? "",
      );
      throw new Error("Your workspace could not be loaded. Please try again.");
    }

    const { data: membership, error: membershipError } = await context.supabase
      .from("workspace_members")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (membershipError || !membership) {
      throw new ForbiddenError("You are not a member of this workspace.");
    }

    return next({
      context: { workspaceId, workspaceRole: membership.role as WorkspaceRole },
    });
  });

/** Platform super admin, checked against the database for every call — never trusted from the UI. */
export const requireSuperadmin = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { data, error } = await context.supabase.rpc("is_superadmin");
    if (error || data !== true) {
      throw new ForbiddenError("Super admin access is required.");
    }
    return next({ context: { superadmin: true as const } });
  });
