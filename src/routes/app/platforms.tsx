import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Link2, Loader2, Unlink } from "lucide-react";
import { useState } from "react";
import { z } from "zod";

import { Badge, ErrorState, LoadingState } from "@/components/case-ui";
import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  disconnectGoogleBusiness,
  getGoogleBusinessConnection,
  startGoogleBusinessConnection,
} from "@/lib/google-business.functions";

export const Route = createFileRoute("/app/platforms")({
  validateSearch: (search) =>
    z.object({ google: z.enum(["connected", "error"]).optional() }).parse(search),
  head: () => ({ meta: [{ title: "Platforms — Removal Work" }] }),
  component: PlatformsPage,
});

const OTHER_PLATFORMS = [
  { name: "Facebook", note: "Needs a Meta business connection. Not available yet." },
  { name: "Instagram", note: "Needs a Meta business connection. Not available yet." },
  { name: "Yelp", note: "Yelp has no reporting API. Not available yet." },
];

function PlatformsPage() {
  const { google } = Route.useSearch();
  const queryClient = useQueryClient();
  const fetchConnection = useServerFn(getGoogleBusinessConnection);
  const start = useServerFn(startGoogleBusinessConnection);
  const disconnect = useServerFn(disconnectGoogleBusiness);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const connection = useQuery({
    queryKey: ["google-business-connection"],
    queryFn: () => fetchConnection({ data: undefined }),
  });
  const data = connection.data;

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const result = await start({ data: { origin: window.location.origin } });
      window.location.assign(result.authorizationUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Google connection couldn't start.");
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await disconnect({ data: undefined });
      await queryClient.invalidateQueries({ queryKey: ["google-business-connection"] });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Google couldn't be disconnected.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <WorkspaceShell
      title="Platforms"
      description="Where your reviews come from, and what each connection can really do."
    >
      {google === "connected" ? (
        <p role="status" className="surface mb-4 flex items-center gap-2 p-4 text-sm text-safe">
          <CheckCircle2 className="size-4" aria-hidden="true" /> Google Business Profile connected.
        </p>
      ) : google === "error" ? (
        <p role="alert" className="surface mb-4 p-4 text-sm text-danger">
          Google didn't finish connecting. Please try again, using the Google account that manages
          the business.
        </p>
      ) : null}

      {connection.isPending ? (
        <LoadingState label="Checking connections…" />
      ) : connection.error || !data ? (
        <ErrorState
          body="We couldn't check your Google connection."
          onRetry={() => void connection.refetch()}
        />
      ) : (
        <div className="grid gap-4">
          <section className="surface grid gap-4 p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold text-ink">
                  Google Business Profile
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.connected
                    ? `Connected${data.email ? ` as ${data.email}` : ""}. Reviews for businesses this account manages are read with Google's official API.`
                    : "Connect the Google account that manages your business listing to read its complete, verified reviews."}
                </p>
              </div>
              <Badge
                tone={
                  data.connected
                    ? "safe"
                    : data.status === "reauthorization_required"
                      ? "warning"
                      : "neutral"
                }
              >
                {data.connected
                  ? "Connected"
                  : data.status === "reauthorization_required"
                    ? "Reconnect needed"
                    : "Not connected"}
              </Badge>
            </div>
            {data.lastError ? <p className="text-sm text-warning">{data.lastError}</p> : null}
            {!data.configured ? (
              <p className="text-sm text-warning">
                Google sign-in isn't configured on the server yet.
              </p>
            ) : null}
            {!data.canManage ? (
              <p className="text-sm text-muted-foreground">
                Only a workspace owner or admin can change this connection.
              </p>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {data.connected ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void remove()}
                  disabled={busy || !data.canManage}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Unlink className="size-4" aria-hidden="true" />
                  )}
                  Disconnect
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() => void connect()}
                  disabled={busy || !data.configured || !data.canManage}
                >
                  {busy ? (
                    <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Link2 className="size-4" aria-hidden="true" />
                  )}
                  Connect Google
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Removal Work never asks for your Google password. Google shows its own consent screen,
              and you can remove access at any time.
            </p>
          </section>

          <section className="surface p-4 sm:p-6">
            <h2 className="font-display text-lg font-semibold text-ink">
              Google Maps (public data)
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Used to identify any business from a pasted link. Google only shares a small sample of
              review text publicly, and sometimes none.
            </p>
          </section>

          <section className="surface p-4 sm:p-6">
            <h2 className="rw-section-title">Other platforms</h2>
            <ul className="grid gap-3">
              {OTHER_PLATFORMS.map((platform) => (
                <li
                  key={platform.name}
                  className="flex flex-wrap items-center justify-between gap-2 text-sm"
                >
                  <span className="font-medium text-ink">{platform.name}</span>
                  <span className="text-muted-foreground">{platform.note}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </WorkspaceShell>
  );
}
