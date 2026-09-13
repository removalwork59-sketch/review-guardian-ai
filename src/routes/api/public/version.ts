import { createFileRoute } from "@tanstack/react-router";

/** Non-secret build identity, so the serving application can be verified from outside. */
export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      GET: () =>
        Response.json(
          {
            app: "review-guardian-ai",
            build: process.env["APP_BUILD_ID"] ?? "unknown",
            commit: process.env["APP_COMMIT"] ?? "unknown",
          },
          { headers: { "cache-control": "no-store" } },
        ),
    },
  },
});
