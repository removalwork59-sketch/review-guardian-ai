import { createFileRoute, redirect } from "@tanstack/react-router";

/** Kept so old bookmarks keep working. */
export const Route = createFileRoute("/_authenticated/locations")({
  beforeLoad: () => {
    throw redirect({ to: "/app/locations" });
  },
});
