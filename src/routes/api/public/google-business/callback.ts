import { createAPIFileRoute } from "@tanstack/react-start/api";

export const APIRoute = createAPIFileRoute("/api/public/google-business/callback")({
  GET: async ({ request }) => {
    const requestUrl = new URL(request.url);
    const state = requestUrl.searchParams.get("state");
    const code = requestUrl.searchParams.get("code");
    const oauthError = requestUrl.searchParams.get("error");
    if (!state || !code || oauthError) return new Response("Google authorization was cancelled or invalid.", { status: 400 });

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { decryptSecret, encryptSecret, exchangeGoogleCode, getGoogleAccountEmail, hashValue } = await import("@/lib/google-business.server");
    const { data: savedState, error: stateError } = await supabaseAdmin
      .from("google_oauth_states")
      .select("id,user_id,code_verifier_ciphertext,redirect_origin,expires_at,used_at")
      .eq("state_hash", hashValue(state))
      .maybeSingle();
    if (stateError || !savedState || savedState.used_at || new Date(savedState.expires_at).getTime() <= Date.now()) {
      return new Response("This Google authorization link expired. Start again from Locations.", { status: 400 });
    }

    await supabaseAdmin.from("google_oauth_states").update({ used_at: new Date().toISOString() }).eq("id", savedState.id).is("used_at", null);
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
  },
});