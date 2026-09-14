import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, MapPin, PlugZap } from "lucide-react";

import { StarRating } from "@/components/brand";
import { EmptyState, ErrorState, LoadingState } from "@/components/case-ui";
import { Button } from "@/components/ui/button";
import { StatTile } from "@/components/ui/stat-tile";
import { WorkspaceShell } from "@/components/workspace-shell";
import { listLocations } from "@/lib/cases.functions";

export const Route = createFileRoute("/app/locations")({
  head: () => ({ meta: [{ title: "Locations — Removal Work" }] }),
  component: LocationsPage,
});

function LocationsPage() {
  const fetchLocations = useServerFn(listLocations);
  const locations = useQuery({
    queryKey: ["locations"],
    queryFn: () => fetchLocations({ data: undefined }),
  });
  const rows = locations.data ?? [];

  return (
    <WorkspaceShell
      title="Locations"
      description="Every business you've scanned. They're added automatically when you check a review."
      actions={
        <Button asChild variant="outline">
          <Link to="/app/platforms">
            <PlugZap className="size-4" aria-hidden="true" />
            Google connection
          </Link>
        </Button>
      }
    >
      {locations.isPending ? (
        <LoadingState label="Loading locations…" />
      ) : locations.error ? (
        <ErrorState
          body="We couldn't load your locations."
          error={locations.error}
          onRetry={() => void locations.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No locations yet"
          body="Scan a review link and the business behind it lands here automatically."
        />
      ) : (
        <div className="rw-card-grid">
          {rows.map((location) => (
            <article key={location.id} className="surface app-card flex min-h-full flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-display text-lg font-semibold text-ink">{location.name}</h2>
                  {location.address ? (
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                      {location.address}
                    </p>
                  ) : null}
                </div>
                {location.mapsUri ? (
                  <a
                    href={location.mapsUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-10 shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Google <ExternalLink className="size-3.5" aria-hidden="true" />
                  </a>
                ) : null}
              </div>
              {location.rating ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <StarRating value={location.rating} />
                  {location.ratingCount?.toLocaleString()} reviews on Google
                </div>
              ) : null}
              <dl className="mt-auto grid grid-cols-3 gap-2 pt-5 text-center">
                <StatTile compact label="Checked" value={location.caseCount} />
                <StatTile compact label="Reported" value={location.reportedCount} />
                <StatTile compact label="Removed" value={location.removedCount} tone="text-safe" />
              </dl>
            </article>
          ))}
        </div>
      )}
    </WorkspaceShell>
  );
}
