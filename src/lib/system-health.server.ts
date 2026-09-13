/**
 * Integration health for the super admin dashboard. Reports configuration presence and live
 * reachability only — never secret values. Results are cached so viewing the dashboard doesn't
 * hammer paid APIs.
 */
import Anthropic from "@anthropic-ai/sdk";

export type HealthStatus = "ok" | "degraded" | "down" | "not_configured";

export type HealthCheck = {
  name: string;
  status: HealthStatus;
  detail: string;
  latencyMs: number | null;
  checkedAt: string;
};

const CACHE_MS = 5 * 60_000;
let cached: { at: number; checks: HealthCheck[] } | null = null;

const present = (...names: string[]) => names.some((name) => Boolean(process.env[name]));

async function probe(name: string, task: () => Promise<{ status: HealthStatus; detail: string }>) {
  const started = Date.now();
  try {
    const result = await task();
    return {
      name,
      ...result,
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      name,
      status: "down" as const,
      detail: error instanceof Error ? error.message.slice(0, 160) : "Unreachable",
      latencyMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    };
  }
}

export function configurationFlags() {
  return {
    supabase: present("SUPABASE_URL") && present("SUPABASE_SERVICE_ROLE_KEY"),
    googlePlacesKey: present("GOOGLE_API_KEY", "GOOGLE_MAPS_API_KEY"),
    googleOauthClient:
      present("GOOGLE_OAUTH_CLIENT_ID", "GOOGLE_BUSINESS_CLIENT_ID") &&
      present("GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_BUSINESS_CLIENT_SECRET"),
    tokenEncryptionKey: present("GOOGLE_BUSINESS_TOKEN_ENCRYPTION_KEY"),
    openai: present("OPENAI_API_KEY"),
    anthropic: present("ANTHROPIC_API_KEY", "CLAUDE_API_KEY"),
    workerSecret: present("CRON_SECRET", "LOVABLE_CRON_SECRET"),
    publicOrigin: present("PUBLIC_ORIGIN"),
  };
}

export async function integrationHealth(force = false): Promise<HealthCheck[]> {
  if (!force && cached && Date.now() - cached.at < CACHE_MS) return cached.checks;
  const flags = configurationFlags();

  const checks = await Promise.all([
    probe("Supabase database", async () => {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error } = await supabaseAdmin
        .from("policy_versions")
        .select("id", { head: true, count: "exact" });
      return error
        ? { status: "down", detail: `Schema check failed (${error.code ?? "error"})` }
        : { status: "ok", detail: "Reachable, Removal Work schema present" };
    }),
    probe("Google Places API", async () => {
      if (!flags.googlePlacesKey)
        return { status: "not_configured", detail: "No server Places key" };
      const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key":
            process.env["GOOGLE_API_KEY"] ?? process.env["GOOGLE_MAPS_API_KEY"] ?? "",
          "X-Goog-FieldMask": "places.id",
        },
        body: JSON.stringify({ textQuery: "Google Sydney", pageSize: 1 }),
        signal: AbortSignal.timeout(10_000),
      });
      await response.body?.cancel().catch(() => undefined);
      return response.ok
        ? {
            status: "ok",
            detail: "Business lookup works (review text availability varies by project)",
          }
        : { status: "down", detail: `HTTP ${response.status}` };
    }),
    probe("Google Business Profile API", async () => {
      if (!flags.googleOauthClient || !flags.tokenEncryptionKey) {
        return { status: "not_configured", detail: "OAuth client or token encryption key missing" };
      }
      const { businessProfileQuotaState } = await import("./google-business-api.server");
      const quota = businessProfileQuotaState();
      if (quota.quotaZero) {
        return {
          status: "degraded",
          detail: "Google reports a 0 requests/minute quota: Basic API Access not approved yet",
        };
      }
      return {
        status: "ok",
        detail: quota.lastSuccessAt
          ? `Last successful call ${quota.lastSuccessAt}`
          : "Configured; no call made since start",
      };
    }),
    probe("OpenAI API", async () => {
      if (!flags.openai)
        return { status: "not_configured", detail: "OPENAI_API_KEY is not set on the server" };
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${process.env["OPENAI_API_KEY"]}` },
        signal: AbortSignal.timeout(10_000),
      });
      await response.body?.cancel().catch(() => undefined);
      return response.ok
        ? { status: "ok", detail: "Credentials accepted" }
        : { status: "down", detail: `HTTP ${response.status}` };
    }),
    probe("Claude API", async () => {
      if (!flags.anthropic)
        return { status: "not_configured", detail: "ANTHROPIC_API_KEY is not set on the server" };
      const client = new Anthropic({
        apiKey: process.env["ANTHROPIC_API_KEY"] ?? process.env["CLAUDE_API_KEY"],
        maxRetries: 0,
        timeout: 10_000,
      });
      await client.models.list({ limit: 1 });
      return { status: "ok", detail: "Credentials accepted" };
    }),
    probe("Background worker", async () => {
      const { lastWorkerTick } = await import("./review-pipeline.server");
      const tick = lastWorkerTick();
      if (!tick)
        return {
          status: flags.workerSecret ? "degraded" : "not_configured",
          detail: "No worker pass since the app started",
        };
      const ageMs = Date.now() - new Date(tick.at).getTime();
      return ageMs < 5 * 60_000
        ? {
            status: "ok",
            detail: `Last pass ${Math.round(ageMs / 1000)}s ago (claimed ${tick.claimed}, retried ${tick.requeued})`,
          }
        : { status: "degraded", detail: `Last pass ${Math.round(ageMs / 60_000)} min ago` };
    }),
  ]);

  cached = { at: Date.now(), checks };
  return checks;
}
