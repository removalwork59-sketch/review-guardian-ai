import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, MapPin } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/case-ui";
import { StarRating } from "@/components/brand";
import { listLocations } from "@/lib/cases.functions";

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
        <div className="grid gap-4 sm:grid-cols-2">
          {locations.map((location) => (
            <article key={location.id} className="surface animate-rise p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
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

              <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                <Mini label="Checked" value={location.caseCount} />
                <Mini label="Reported" value={location.reportedCount} />
                <Mini label="Removed" value={location.removedCount} tone="text-safe" />
              </dl>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Mini({ label, value, tone = "text-ink" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`font-display text-lg font-semibold ${tone}`}>{value}</dd>
    </div>
  );
}
