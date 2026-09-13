import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink, Link2, Loader2, MapPin, Unlink } from "lucide-react";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/case-ui";
import { StarRating } from "@/components/brand";
import { listLocations } from "@/lib/cases.functions";
import { StatTile } from "@/components/ui/stat-tile";
import { Button } from "@/components/ui/button";
import { disconnectGoogleBusiness, getGoogleBusinessConnection, startGoogleBusinessConnection } from "@/lib/google-business.functions";

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
  const queryClient = useQueryClient();
  const fetchConnection = useServerFn(getGoogleBusinessConnection);
  const startConnection = useServerFn(startGoogleBusinessConnection);
  const disconnect = useServerFn(disconnectGoogleBusiness);
  const [connectionBusy, setConnectionBusy] = useState(false);
  const { data: connection } = useQuery({
    queryKey: ["google-business-connection"],
    queryFn: () => fetchConnection({ data: undefined }),
  });

  async function connectGoogle() {
    setConnectionBusy(true);
    try {
      const result = await startConnection({ data: { origin: window.location.origin } });
      window.location.assign(result.authorizationUrl);
    } finally {
      setConnectionBusy(false);
    }
  }

  async function disconnectGoogle() {
    setConnectionBusy(true);
    try {
      await disconnect({ data: undefined });
      await queryClient.invalidateQueries({ queryKey: ["google-business-connection"] });
    } finally {
      setConnectionBusy(false);
    }
  }

  return (
    <AppShell
      title="Locations"
      description="Every business you've scanned, with its review activity."
    >
      <section className="surface mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg font-semibold text-ink">Google Business Profile</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {connection?.connected
              ? `Connected${connection.email ? ` as ${connection.email}` : ""}. Your authorized listings can be synced here.`
              : "Connect the Google account that manages your listings to access complete owner-authorized reviews."}
          </p>
          {!connection?.configured ? <p className="mt-2 text-sm text-warning">Google OAuth credentials are required before connection can begin.</p> : null}
        </div>
        {connection?.connected ? (
          <Button type="button" variant="outline" onClick={disconnectGoogle} disabled={connectionBusy}>
            {connectionBusy ? <Loader2 className="animate-spin" /> : <Unlink />} Disconnect
          </Button>
        ) : (
          <Button type="button" onClick={connectGoogle} disabled={connectionBusy || !connection?.configured}>
            {connectionBusy ? <Loader2 className="animate-spin" /> : <Link2 />} Connect Google
          </Button>
        )}
      </section>
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
