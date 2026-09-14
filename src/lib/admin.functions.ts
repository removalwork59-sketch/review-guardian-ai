import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { dbError } from "./errors";

import type { Json } from "@/integrations/supabase/types";
import { requireSuperadmin } from "./workspace-middleware";

export type AdminOverview = {
  database: Json | null;
  databaseError: string | null;
  integrations: Array<{
    name: string;
    status: string;
    detail: string;
    latencyMs: number | null;
    checkedAt: string;
  }>;
  configuration: Record<string, boolean>;
  app: {
    build: string;
    commit: string;
    uptimeSeconds: number;
    node: string;
    pipeline: { active: number; waiting: number; concurrency: number };
  };
};

export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSuperadmin])
  .inputValidator((input: unknown) =>
    z.object({ refresh: z.boolean().default(false) }).parse(input ?? {}),
  )
  .handler(async ({ data, context }): Promise<AdminOverview> => {
    const { configurationFlags, integrationHealth } = await import("./system-health.server");
    const { pipelineLoad } = await import("./review-pipeline.server");
    const { data: database, error } = await context.supabase.rpc("admin_system_overview");
    return {
      database: database ?? null,
      databaseError: error ? `${error.code ?? ""} ${error.message}`.trim() : null,
      integrations: await integrationHealth(data.refresh),
      configuration: configurationFlags(),
      app: {
        build: process.env["APP_BUILD_ID"] ?? "unknown",
        commit: process.env["APP_COMMIT"] ?? "unknown",
        uptimeSeconds: Math.round(process.uptime()),
        node: process.version,
        pipeline: pipelineLoad(),
      },
    };
  });

const listSchema = z.object({
  status: z.string().max(40).optional(),
  limit: z.number().int().min(1).max(200).default(50),
});

export const listAdminJobs = createServerFn({ method: "POST" })
  .middleware([requireSuperadmin])
  .inputValidator((input: unknown) => listSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    let query = context.supabase
      .from("review_jobs")
      .select(
        "id,status,detail,error_code,attempt_count,max_attempts,source_url,created_at,updated_at,workspace_id,workspaces(name)",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status) query = query.eq("status", data.status);
    const { data: rows, error } = await query;
    if (error) throw dbError(error);
    return rows ?? [];
  });

export const retryAdminJob = createServerFn({ method: "POST" })
  .middleware([requireSuperadmin])
  .inputValidator((input: unknown) => z.object({ jobId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("review_jobs")
      .update({
        status: "queued",
        detail: "Retried by an administrator",
        next_attempt_at: new Date().toISOString(),
      })
      .eq("id", data.jobId)
      .eq("status", "failed")
      .select("id,workspace_id,attempt_count,max_attempts")
      .maybeSingle();
    if (error) throw dbError(error);
    if (!row) throw new Error("Only failed jobs can be retried.");
    if (row.attempt_count >= row.max_attempts) {
      await supabaseAdmin
        .from("review_jobs")
        .update({ max_attempts: row.attempt_count + 1 })
        .eq("id", row.id);
    }
    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      workspaceId: row.workspace_id,
      actorId: context.userId,
      action: "admin.review_job.retried",
      entityType: "review_job",
      entityId: row.id,
    });
    const { runReviewJob } = await import("./review-pipeline.server");
    void runReviewJob(row.id).catch((failure) =>
      console.error("[admin] retry run failed", failure),
    );
    return { ok: true as const };
  });

export const listAdminWorkspaces = createServerFn({ method: "POST" })
  .middleware([requireSuperadmin])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("workspaces")
      .select(
        "id,name,created_at,deleted_at,workspace_members(count),review_cases(count),reports(count)",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw dbError(error);
    return data ?? [];
  });

export const listAdminUsers = createServerFn({ method: "POST" })
  .middleware([requireSuperadmin])
  .handler(async ({ context }) => {
    const [{ data: profiles, error }, { data: roles }, { data: memberships }] = await Promise.all([
      context.supabase
        .from("profiles")
        .select("id,email,display_name,full_name,created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      context.supabase.from("user_roles").select("user_id,role"),
      context.supabase
        .from("workspace_members")
        .select("user_id,role,workspace_id,workspaces(name)"),
    ]);
    if (error) throw dbError(error);
    return (profiles ?? []).map((profile) => ({
      id: profile.id,
      email: profile.email,
      name: profile.display_name || profile.full_name || "",
      createdAt: profile.created_at,
      platformRoles: (roles ?? [])
        .filter((role) => role.user_id === profile.id)
        .map((role) => role.role),
      workspaces: (memberships ?? [])
        .filter((membership) => membership.user_id === profile.id)
        .map((membership) => ({
          id: membership.workspace_id,
          role: membership.role,
          name: (membership.workspaces as { name?: string } | null)?.name ?? "",
        })),
    }));
  });

export const listAdminAuditLogs = createServerFn({ method: "POST" })
  .middleware([requireSuperadmin])
  .inputValidator((input: unknown) => listSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("audit_logs")
      .select("id,action,entity_type,entity_id,actor_id,workspace_id,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw dbError(error);
    return rows ?? [];
  });

export const listAdminAiRuns = createServerFn({ method: "POST" })
  .middleware([requireSuperadmin])
  .inputValidator((input: unknown) => listSchema.parse(input ?? {}))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("ai_runs")
      .select(
        "id,stage,provider,model,status,error_code,confidence,duration_ms,prompt_version,policy_version,created_at,workspace_id",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw dbError(error);
    return rows ?? [];
  });
