import { createHash, randomBytes, webcrypto } from "node:crypto";

const BUSINESS_SCOPE = "https://www.googleapis.com/auth/business.manage";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const REVOKE_URL = "https://oauth2.googleapis.com/revoke";

export const GOOGLE_CALLBACK_PATH = "/api/public/google/callback";

function env(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`${names[0]} is not configured.`);
}

const clientId = () => env("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_BUSINESS_CLIENT_ID");
const clientSecret = () => env("GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_BUSINESS_CLIENT_SECRET");

export function isGoogleBusinessConfigured() {
  return Boolean(
    (process.env["GOOGLE_OAUTH_CLIENT_ID"] || process.env["GOOGLE_BUSINESS_CLIENT_ID"]) &&
    (process.env["GOOGLE_OAUTH_CLIENT_SECRET"] || process.env["GOOGLE_BUSINESS_CLIENT_SECRET"]) &&
    process.env["GOOGLE_BUSINESS_TOKEN_ENCRYPTION_KEY"],
  );
}

function bytesToBase64Url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

async function encryptionKey() {
  const raw = createHash("sha256").update(env("GOOGLE_BUSINESS_TOKEN_ENCRYPTION_KEY")).digest();
  return webcrypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const encrypted = await webcrypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    await encryptionKey(),
    new TextEncoder().encode(value),
  );
  return `${bytesToBase64Url(iv)}.${bytesToBase64Url(new Uint8Array(encrypted))}`;
}

export async function decryptSecret(value: string) {
  const [ivPart, payloadPart] = value.split(".");
  if (!ivPart || !payloadPart) throw new Error("Stored Google credential is invalid.");
  const decrypted = await webcrypto.subtle.decrypt(
    { name: "AES-GCM", iv: Buffer.from(ivPart, "base64url") },
    await encryptionKey(),
    Buffer.from(payloadPart, "base64url"),
  );
  return new TextDecoder().decode(decrypted);
}

export function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function createGoogleAuthorization(redirectUri: string) {
  const state = bytesToBase64Url(randomBytes(32));
  const verifier = bytesToBase64Url(randomBytes(48));
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId());
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", `${BUSINESS_SCOPE} openid email`);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return { state, verifier, url: url.toString() };
}

async function tokenRequest(body: Record<string, string>) {
  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    signal: AbortSignal.timeout(15_000),
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { response, payload };
}

export async function exchangeGoogleCode(code: string, verifier: string, redirectUri: string) {
  const { response, payload } = await tokenRequest({
    code,
    code_verifier: verifier,
    client_id: clientId(),
    client_secret: clientSecret(),
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });
  if (!response.ok || typeof payload["access_token"] !== "string") {
    console.error(
      `Google token exchange failed [${response.status}]: ${String(payload["error"] ?? "")}`,
    );
    throw new Error("Google did not authorize Business Profile access.");
  }
  return {
    accessToken: payload["access_token"],
    refreshToken: typeof payload["refresh_token"] === "string" ? payload["refresh_token"] : null,
    expiresIn: typeof payload["expires_in"] === "number" ? payload["expires_in"] : 3600,
    scopes: typeof payload["scope"] === "string" ? payload["scope"].split(" ") : [],
  };
}

/** Exchanges a stored refresh token for a fresh access token. */
export async function refreshGoogleAccessToken(refreshToken: string) {
  const { response, payload } = await tokenRequest({
    refresh_token: refreshToken,
    client_id: clientId(),
    client_secret: clientSecret(),
    grant_type: "refresh_token",
  });
  if (!response.ok || typeof payload["access_token"] !== "string") {
    const reason = String(payload["error"] ?? response.status);
    const error = new Error(`Google refused to refresh the connection (${reason}).`) as Error & {
      reauthorize?: boolean;
    };
    error.reauthorize = reason === "invalid_grant";
    throw error;
  }
  return {
    accessToken: payload["access_token"],
    expiresIn: typeof payload["expires_in"] === "number" ? payload["expires_in"] : 3600,
  };
}

/** Best-effort revoke so the Google account no longer lists this app as authorized. */
export async function revokeGoogleToken(token: string) {
  try {
    const response = await fetch(REVOKE_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function getGoogleAccountEmail(accessToken: string) {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as { email?: string };
  return payload.email ?? null;
}

/** Only the production origin, Lovable previews and localhost may start or finish Google OAuth. */
export function assertAllowedOrigin(origin: string) {
  const url = new URL(origin);
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !local) throw new Error("Google connection requires HTTPS.");
  const configured = process.env["PUBLIC_ORIGIN"];
  const productionHost = configured ? new URL(configured).hostname : null;
  const allowed =
    local ||
    url.hostname === productionHost ||
    url.hostname === "removalwork.online" ||
    url.hostname.endsWith(".lovable.app");
  if (!allowed) throw new Error("This origin is not allowed.");
  return url.origin;
}
