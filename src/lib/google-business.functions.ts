import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { assertWorkspaceRole, requireWorkspace } from "./workspace-middleware";

export type GoogleBusinessConnection = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  status: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
  canManage: boolean;
};

export const getGoogleBusinessConnection = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .handler(async ({ context }): Promise<GoogleBusinessConnection> => {
    const { isGoogleBusinessConfigured } = await import("./google-business.server");
    // Token rows are never readable by clients; only non-secret fields leave the server.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("google_business_connections")
      .select("google_account_email,status,last_synced_at,last_error")
      .eq("workspace_id", context.workspaceId)
      .maybeSingle();
    if (error) throw error;
    return {
      configured: isGoogleBusinessConfigured(),
      connected: data?.status === "connected",
      email: data?.google_account_email ?? null,
      status: data?.status ?? null,
      lastSyncedAt: data?.last_synced_at ?? null,
      lastError: data?.last_error ?? null,
      canManage: ["owner", "admin"].includes(context.workspaceRole),
    };
  });

export const startGoogleBusinessConnection = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .inputValidator((input: unknown) => z.object({ origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    assertWorkspaceRole(context.workspaceRole, "admin");
    const {
      GOOGLE_CALLBACK_PATH,
      assertAllowedOrigin,
      createGoogleAuthorization,
      encryptSecret,
      hashValue,
    } = await import("./google-business.server");
    const origin = assertAllowedOrigin(data.origin);
    const authorization = createGoogleAuthorization(`${origin}${GOOGLE_CALLBACK_PATH}`);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("google_oauth_states").insert({
      workspace_id: context.workspaceId,
      user_id: context.userId,
      state_hash: hashValue(authorization.state),
      code_verifier_ciphertext: await encryptSecret(authorization.verifier),
      redirect_origin: origin,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (error) throw error;

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      action: "google.connection.started",
      entityType: "google_business_connection",
    });
    return { authorizationUrl: authorization.url };
  });

export const disconnectGoogleBusiness = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .handler(async ({ context }) => {
    assertWorkspaceRole(context.workspaceRole, "admin");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: connection } = await supabaseAdmin
      .from("google_business_connections")
      .select("refresh_token_ciphertext")
      .eq("workspace_id", context.workspaceId)
      .maybeSingle();
    if (connection?.refresh_token_ciphertext) {
      const { decryptSecret, revokeGoogleToken } = await import("./google-business.server");
      const token = await decryptSecret(connection.refresh_token_ciphertext).catch(() => null);
      if (token) await revokeGoogleToken(token);
    }
    const { error } = await supabaseAdmin
      .from("google_business_connections")
      .delete()
      .eq("workspace_id", context.workspaceId);
    if (error) throw error;

    const { forgetOwnedLocations } = await import("./google-business-api.server");
    forgetOwnedLocations(context.workspaceId);
    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      action: "google.connection.disconnected",
      entityType: "google_business_connection",
    });
    return { disconnected: true };
  });
