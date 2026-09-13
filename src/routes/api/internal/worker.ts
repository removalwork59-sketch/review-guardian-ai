import { createFileRoute } from "@tanstack/react-router";

/**
 * Background worker pass, called every minute by the removalwork-worker systemd timer on the VPS.
 * Requires the worker secret; nginx additionally refuses /api/internal/* from outside the server.
 */
async function handle({ request }: { request: Request }) {
  const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
  const unauthorized = await authenticateCronRequest(request);
  if (unauthorized) return unauthorized;

  const { runWorkerTick } = await import("@/lib/review-pipeline.server");
  try {
    return Response.json({ ok: true, ...(await runWorkerTick()) });
  } catch (error) {
    console.error("[worker] tick failed", error);
    return Response.json({ ok: false, error: "Worker pass failed" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/internal/worker")({
  server: { handlers: { POST: handle, GET: handle } },
});
