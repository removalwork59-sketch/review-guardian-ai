import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const state = requestUrl.searchParams.get("state");
        const code = requestUrl.searchParams.get("code");
        const oauthError = requestUrl.searchParams.get("error");
        if (state?.startsWith("login.")) {
          const { finishGoogleLogin } = await import("@/lib/google-login.server");
          return finishGoogleLogin(request);
        }
        if (!state || !code || oauthError) {
          return new Response("Google authorization was cancelled or invalid.", { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const {
          GOOGLE_CALLBACK_PATH,
          decryptSecret,
          encryptSecret,
          exchangeGoogleCode,
          getGoogleAccountEmail,
          hashValue,
        } = await import("@/lib/google-business.server");

        // One-time, expiring, hashed state bound to the workspace and user that started the flow.
        const { data: claimedStates, error: stateError } = await supabaseAdmin.rpc(
          "claim_google_oauth_state",
          { _state_hash: hashValue(state) },
        );
        const savedState = claimedStates?.[0];
        if (stateError || !savedState) {
          return new Response(
            "This Google authorization link expired. Start again from Platforms.",
            {
              status: 400,
            },
          );
        }

        const back = (result: "connected" | "error") =>
          Response.redirect(`${savedState.redirect_origin}/app/platforms?google=${result}`, 302);

        try {
          const tokens = await exchangeGoogleCode(
            code,
            await decryptSecret(savedState.code_verifier_ciphertext),
            `${savedState.redirect_origin}${GOOGLE_CALLBACK_PATH}`,
          );
          if (!tokens.scopes.includes("https://www.googleapis.com/auth/business.manage")) {
            throw new Error("Google did not grant Business Profile access.");
          }
          const { data: existing } = await supabaseAdmin
            .from("google_business_connections")
            .select("refresh_token_ciphertext")
            .eq("workspace_id", savedState.workspace_id)
            .maybeSingle();
          const refreshCiphertext = tokens.refreshToken
            ? await encryptSecret(tokens.refreshToken)
            : existing?.refresh_token_ciphertext;
          if (!refreshCiphertext) {
            throw new Error("Google did not return offline access. Please authorize again.");
          }

          const { error: saveError } = await supabaseAdmin
            .from("google_business_connections")
            .upsert(
              {
                workspace_id: savedState.workspace_id,
                connected_by: savedState.user_id,
                google_account_email: await getGoogleAccountEmail(tokens.accessToken),
                access_token_ciphertext: await encryptSecret(tokens.accessToken),
                refresh_token_ciphertext: refreshCiphertext,
                token_expires_at: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
                scopes: tokens.scopes,
                status: "connected",
                last_error: null,
              },
              { onConflict: "workspace_id" },
            );
          if (saveError) throw saveError;

          const { forgetOwnedLocations } = await import("@/lib/google-business-api.server");
          forgetOwnedLocations(savedState.workspace_id);
          const { writeAudit } = await import("@/lib/audit.server");
          await writeAudit({
            workspaceId: savedState.workspace_id,
            actorId: savedState.user_id,
            action: "google.connection.connected",
            entityType: "google_business_connection",
          });
          return back("connected");
        } catch (error) {
          console.error(
            "Google Business Profile connection failed.",
            error instanceof Error ? error.message : "",
          );
          return back("error");
        }
      },
    },
  },
});
