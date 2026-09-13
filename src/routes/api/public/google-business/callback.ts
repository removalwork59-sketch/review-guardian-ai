import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/google-business/callback")({
  server: { handlers: { GET: async ({ request }) => {
    const requestUrl = new URL(request.url);
    const state = requestUrl.searchParams.get("state");
    const code = requestUrl.searchParams.get("code");
    const oauthError = requestUrl.searchParams.get("error");
    if (!state || !code || oauthError) return new Response("Google authorization was cancelled or invalid.", { status: 400 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decryptSecret, encryptSecret, exchangeGoogleCode, getGoogleAccountEmail, hashValue } = await import("@/lib/google-business.server");
    const { data: claimedStates, error: stateError } = await supabaseAdmin
      .rpc("claim_google_oauth_state", { _state_hash: hashValue(state) });
    const savedState = claimedStates?.[0];
    if (stateError || !savedState) {
      return new Response("This Google authorization link expired. Start again from Locations.", { status: 400 });
    }
    try {
      const tokens = await exchangeGoogleCode(
        code,
        await decryptSecret(savedState.code_verifier_ciphertext),
        `${savedState.redirect_origin}/api/public/google-business/callback`,
      );
      const { data: existing } = await supabaseAdmin
        .from("google_business_connections")
        .select("refresh_token_ciphertext")
        .eq("user_id", savedState.user_id)
        .maybeSingle();
      const refreshCiphertext = tokens.refreshToken
        ? await encryptSecret(tokens.refreshToken)
        : existing?.refresh_token_ciphertext;
      if (!refreshCiphertext) throw new Error("Google did not return offline access. Please authorize again.");
      const { error: saveError } = await supabaseAdmin.from("google_business_connections").upsert({
        user_id: savedState.user_id,
        google_account_email: await getGoogleAccountEmail(tokens.accessToken),
        access_token_ciphertext: await encryptSecret(tokens.accessToken),
        refresh_token_ciphertext: refreshCiphertext,
        token_expires_at: new Date(Date.now() + tokens.expiresIn * 1000).toISOString(),
        scopes: tokens.scopes,
        status: "connected",
        last_error: null,
      }, { onConflict: "user_id" });
      if (saveError) throw saveError;
      return Response.redirect(`${savedState.redirect_origin}/locations?google=connected`, 302);
    } catch {
      return Response.redirect(`${savedState.redirect_origin}/locations?google=error`, 302);
    }
  } } },
});