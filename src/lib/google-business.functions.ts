import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GoogleBusinessConnection = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  status: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
};

export const getGoogleBusinessConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GoogleBusinessConnection> => {
    const { data, error } = await context.supabase
      .from("google_business_connections")
      .select("google_account_email,status,last_synced_at,last_error")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    const { isGoogleBusinessConfigured } = await import("./google-business.server");
    return {
      configured: isGoogleBusinessConfigured(),
      connected: data?.status === "connected",
      email: data?.google_account_email ?? null,
      status: data?.status ?? null,
      lastSyncedAt: data?.last_synced_at ?? null,
      lastError: data?.last_error ?? null,
    };
  });

export const startGoogleBusinessConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const {
      GOOGLE_CALLBACK_PATH,
      assertAllowedOrigin,
      createGoogleAuthorization,
      encryptSecret,
      hashValue,
    } = await import("./google-business.server");
    const origin = assertAllowedOrigin(data.origin);
    const redirectUri = `${origin}${GOOGLE_CALLBACK_PATH}`;
    const authorization = createGoogleAuthorization(redirectUri);
    const { error } = await context.supabase.from("google_oauth_states").insert({
      user_id: context.userId,
      state_hash: hashValue(authorization.state),
      code_verifier_ciphertext: await encryptSecret(authorization.verifier),
      redirect_origin: origin,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (error) throw error;
    return { authorizationUrl: authorization.url };
  });

export const disconnectGoogleBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: connection } = await context.supabase
      .from("google_business_connections")
      .select("refresh_token_ciphertext")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (connection?.refresh_token_ciphertext) {
      const { decryptSecret, revokeGoogleToken } = await import("./google-business.server");
      const token = await decryptSecret(connection.refresh_token_ciphertext).catch(() => null);
      if (token) await revokeGoogleToken(token);
    }
    const { error } = await context.supabase
      .from("google_business_connections")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw error;
    return { disconnected: true };
  });
