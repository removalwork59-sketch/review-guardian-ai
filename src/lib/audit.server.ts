import type { Json } from "@/integrations/supabase/types";

/** Appends to the audit log. Failures are logged but never break the user's action. */
export async function writeAudit(entry: {
  workspaceId: string | null;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, Json>;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("audit_logs").insert({
      workspace_id: entry.workspaceId,
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? {},
    });
    if (error) console.error("[audit] write failed", error.code, error.message);
  } catch (error) {
    console.error("[audit] write failed", error instanceof Error ? error.message : error);
  }
}
