import { createFileRoute, redirect } from "@tanstack/react-router";

/** Kept so old bookmarks keep working. */
export const Route = createFileRoute("/_authenticated/bulk")({
  beforeLoad: () => {
    throw redirect({ to: "/app/bulk" });
  },
});
