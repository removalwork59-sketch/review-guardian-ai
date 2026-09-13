import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MapPin } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/case-ui";
import { StarRating } from "@/components/brand";
import { listLocations } from "@/lib/cases.functions";
import { StatTile } from "@/components/ui/stat-tile";

export const Route = createFileRoute("/_authenticated/locations")({
  head: () => ({
    meta: [
      { title: "Locations — Removal Work" },
      { name: "description", content: "The businesses you've scanned and how each one is doing." },
      { property: "og:title", content: "Locations — Removal Work" },
      {
        property: "og:description",
        content: "The businesses you've scanned and how each one is doing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LocationsPage,
});

function LocationsPage() {
  const fetchLocations = useServerFn(listLocations);
  const { data, isPending } = useQuery({
    queryKey: ["locations"],
    queryFn: () => fetchLocations({ data: undefined }),
  });

  const locations = data ?? [];

  return (
    <AppShell
      title="Locations"
      description="Every business you've scanned, with its review activity."
    >
      {isPending ? (
        <EmptyState title="Loading your locations…" body="One moment." />
      ) : locations.length === 0 ? (
        <EmptyState
          title="No locations yet"
          body="Scan a review link and the business behind it lands here automatically."
        />
      ) : (
        <div className="app-card-grid">
          {locations.map((location) => (
            <article key={location.id} className="surface app-card flex min-h-full flex-col animate-rise">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <p className="font-display text-lg font-semibold text-ink">{location.name}</p>
                  {location.address ? (
                    <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                      <MapPin className="mt-0.5 size-3.5 shrink-0" />
                      {location.address}
                    </p>
                  ) : null}
                </div>
                {location.mapsUri ? (
                  <a
                    href={location.mapsUri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                  >
                    Google
                    <ExternalLink className="size-3.5" />
                  </a>
                ) : null}
              </div>

              {location.rating ? (
                <div className="mt-3 flex items-center gap-2">
                  <StarRating value={location.rating} />
                  <span className="text-sm text-muted-foreground">
                    {location.ratingCount?.toLocaleString()} reviews on Google
                  </span>
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
    </AppShell>
  );
}
