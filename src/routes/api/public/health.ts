import { createFileRoute } from "@tanstack/react-router";

/** Liveness and database readiness for uptime monitoring. No secrets or configuration details. */
export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const started = Date.now();
        let database: "ok" | "schema_missing" | "unavailable" = "ok";
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          // A real row query: PostgREST HEAD requests don't report a missing table as an error.
          const { error } = await supabaseAdmin.from("review_jobs").select("id").limit(1);
          if (error) database = error.code === "PGRST205" ? "schema_missing" : "unavailable";
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
