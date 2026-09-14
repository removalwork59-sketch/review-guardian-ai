import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { decryptSecret, encryptSecret, GOOGLE_CALLBACK_PATH } from "./google-business.server";

/**
 * Google sign-in without Supabase's hosted redirect.
 *
 * Supabase's own Google provider sends Google a redirect URI on supabase.co that is not registered
 * on this project's OAuth client, so Google refused it (redirect_uri_mismatch). This flow uses the
 * app's registered callback instead: authorization code + PKCE on the server, a one-time encrypted
 * cookie bound to the state, then Supabase's id_token grant to create the normal Supabase session.
 * Tokens reach the browser only in the URL fragment, which is never sent to any server.
 */

const COOKIE = "rw_google_login";
const TTL_MS = 10 * 60_000;
export const GOOGLE_LOGIN_STATE_PREFIX = "login.";

function env(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`${names[0]} is not configured.`);
}

const origin = () => env("PUBLIC_ORIGIN").replace(/\/$/, "");
const redirectUri = () => `${origin()}${GOOGLE_CALLBACK_PATH}`;
const cookieAttributes = "Path=/api/public/google; HttpOnly; Secure; SameSite=Lax";

function readCookie(request: Request, name: string) {
  for (const part of (request.headers.get("cookie") ?? "").split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return rest.join("=");
  }
  return null;
}

function redirect(location: string, cookie?: string) {
  const headers = new Headers({ Location: location, "Cache-Control": "no-store" });
  if (cookie) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 302, headers });
}

function failure(reason: string) {
  return redirect(
    `${origin()}/auth?google=error&reason=${encodeURIComponent(reason)}`,
    `${COOKIE}=; ${cookieAttributes}; Max-Age=0`,
  );
}

export async function startGoogleLogin() {
  const nonce = randomBytes(32).toString("base64url");
  const verifier = randomBytes(48).toString("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", env("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_BUSINESS_CLIENT_ID"));
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("state", `${GOOGLE_LOGIN_STATE_PREFIX}${nonce}`);
  url.searchParams.set("code_challenge", createHash("sha256").update(verifier).digest("base64url"));
  url.searchParams.set("code_challenge_method", "S256");
  const sealed = await encryptSecret(JSON.stringify({ nonce, verifier, exp: Date.now() + TTL_MS }));
  return redirect(
    url.toString(),
    `${COOKIE}=${sealed}; ${cookieAttributes}; Max-Age=${TTL_MS / 1000}`,
  );
}

export async function finishGoogleLogin(request: Request) {
  const params = new URL(request.url).searchParams;
  const state = params.get("state") ?? "";
  const code = params.get("code");
  if (params.get("error")) return failure("cancelled");

  const sealed = readCookie(request, COOKIE);
  if (!sealed || !code) return failure("expired");
  let saved: { nonce: string; verifier: string; exp: number };
  try {
    saved = JSON.parse(await decryptSecret(sealed)) as typeof saved;
  } catch {
    return failure("expired");
  }
  const expected = Buffer.from(`${GOOGLE_LOGIN_STATE_PREFIX}${saved.nonce}`);
  const received = Buffer.from(state);
  if (
    saved.exp < Date.now() ||
    expected.length !== received.length ||
    !timingSafeEqual(expected, received)
  ) {
    return failure("expired");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: saved.verifier,
      client_id: env("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_BUSINESS_CLIENT_ID"),
      client_secret: env("GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_BUSINESS_CLIENT_SECRET"),
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  const google = (await tokenResponse?.json().catch(() => ({}))) as {
    id_token?: string;
    error?: string;
  };
  if (!tokenResponse?.ok || !google.id_token) {
    console.error(
      "[google-login] code exchange failed",
      tokenResponse?.status ?? "network",
      google.error ?? "",
    );
    return failure("google");
  }

  const supabaseResponse = await fetch(`${env("SUPABASE_URL")}/auth/v1/token?grant_type=id_token`, {
    method: "POST",
    headers: { apikey: env("SUPABASE_PUBLISHABLE_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "google", id_token: google.id_token }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => null);
  const session = (await supabaseResponse?.json().catch(() => ({}))) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    expires_at?: number;
    token_type?: string;
    error_code?: string;
    msg?: string;
  };
  if (!supabaseResponse?.ok || !session.access_token || !session.refresh_token) {
    console.error(
      "[google-login] supabase sign-in failed",
      supabaseResponse?.status ?? "network",
      session.error_code ?? session.msg ?? "",
    );
    return failure("account");
  }

  const fragment = new URLSearchParams({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    expires_in: String(session.expires_in ?? 3600),
    expires_at: String(
      session.expires_at ?? Math.floor(Date.now() / 1000) + (session.expires_in ?? 3600),
    ),
    token_type: session.token_type ?? "bearer",
    type: "google",
  });
  return redirect(
    `${origin()}/auth#${fragment.toString()}`,
    `${COOKIE}=; ${cookieAttributes}; Max-Age=0`,
  );
}
