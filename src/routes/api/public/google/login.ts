import { createFileRoute } from "@tanstack/react-router";

/** Starts Google sign-in (see google-login.server.ts). */
export const Route = createFileRoute("/api/public/google/login")({
  server: {
    handlers: {
      GET: async () => {
        const { startGoogleLogin } = await import("@/lib/google-login.server");
        return startGoogleLogin();
      },
    },
  },
});
