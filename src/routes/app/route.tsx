import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SessionGate } from "@/components/session-gate";

/** Client workspace. The session check here is for navigation; every server call re-checks. */
export const Route = createFileRoute("/app")({
  ssr: false,
  component: () => (
    <SessionGate>
      <Outlet />
    </SessionGate>
  ),
});
