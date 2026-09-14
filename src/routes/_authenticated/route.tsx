import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SessionGate } from "@/components/session-gate";

/** Legacy signed-in routes. The session check here is for navigation; every server call re-checks. */
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: () => (
    <SessionGate>
      <Outlet />
    </SessionGate>
  ),
});
