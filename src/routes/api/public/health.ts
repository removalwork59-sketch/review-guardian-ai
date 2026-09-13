import { createFileRoute } from "@tanstack/react-router";

/** Liveness and database readiness for uptime monitoring. No secrets or configuration details. */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        let database: "ok" | "unavailable" = "ok";
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { error } = await supabaseAdmin
            .from("policy_versions")
            .select("id", { head: true, count: "exact" });
          if (error) database = "unavailable";
        } catch {
          database = "unavailable";
        }
        const healthy = database === "ok";
        return Response.json(
          {
            status: healthy ? "ok" : "degraded",
            database,
            build: process.env["APP_BUILD_ID"] ?? "unknown",
            commit: process.env["APP_COMMIT"] ?? "unknown",
            uptimeSeconds: Math.round(process.uptime()),
            latencyMs: Date.now() - started,
          },
          { status: healthy ? 200 : 503, headers: { "cache-control": "no-store" } },
        );
      },
    },
  },
});
