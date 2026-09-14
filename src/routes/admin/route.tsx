import { createFileRoute, Outlet } from "@tanstack/react-router";

import { SessionGate } from "@/components/session-gate";

/** Super admin area. Signed-in check for navigation; authorization is enforced by every server call. */
export const Route = createFileRoute("/admin")({
  ssr: false,
  component: () => (
    <SessionGate>
      <Outlet />
    </SessionGate>
  ),
});
