import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { Wordmark } from "@/components/brand";
import {
  PUBLIC_PROGRESS,
  PUBLIC_PROGRESS_STEPS,
  listPublicCaseStatuses,
} from "@/lib/public-status.functions";

export const Route = createFileRoute("/scan/")({
  loader: () => listPublicCaseStatuses(),
  errorComponent: () => (
    <div className="page-shell">
      <main className="page-main">
        <h1 className="page-title">Status board unavailable</h1>
        <p className="page-lede">Please refresh the page and try again.</p>
      </main>
    </div>
  ),
  notFoundComponent: () => (
    <div className="page-shell">
      <main className="page-main">
        <h1 className="page-title">Not found</h1>
      </main>
    </div>
  ),
  head: () => ({
    meta: [
      { title: "Public review status board — Removal Work" },
      {
        name: "description",
        content:
          "Owner-published progress for review policy cases: prepared, submitted, awaiting outcome, and the confirmed result.",
      },
      { property: "og:title", content: "Public review status board — Removal Work" },
      {
        property: "og:description",
        content: "Owner-published progress for review policy cases, with honest outcome tracking.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/scan" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/scan" }],
  }),
  component: PublicStatusPage,
});

function PublicStatusPage() {
  const entries = Route.useLoaderData();

  return (
    <div className="page-shell">
      <header className="page-header">
        <Link to="/" aria-label="Removal Work home">
          <Wordmark />
        </Link>
        <Link to="/" className="page-back">
          <ArrowLeft className="size-4" /> Home
        </Link>
      </header>
      <main className="page-main">
        <h1 className="page-title">Public review status board</h1>
        <p className="page-lede">
          Each entry below was published by its owner. Statuses are owner-confirmed — Google gives
          no API for report outcomes, so nothing here is an automated platform confirmation. Review
          text, reviewer names and business details stay private.
        </p>

        {entries.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
            No cases have been published yet.
          </p>
        ) : (
          <ul className="mt-8 grid gap-4">
            {entries.map((entry) => {
              const progress = PUBLIC_PROGRESS[entry.status];
              return (
                <li
                  key={entry.id}
                  className="rounded-2xl border border-border bg-card p-5 shadow-sm"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {entry.platform === "google" ? "Google Maps" : entry.platform}
                      </p>
                      <h2 className="mt-1 break-words text-base font-bold text-ink">
                        {entry.headline}
                      </h2>
                    </div>
                    <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
                      {entry.confidence}% confidence
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-ink">{progress.label}</p>
                  <div
                    className="mt-2 flex gap-1.5"
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={PUBLIC_PROGRESS_STEPS}
                    aria-valuenow={progress.step}
                    aria-label={`Progress: ${progress.label}`}
                  >
                    {Array.from({ length: PUBLIC_PROGRESS_STEPS }, (_, index) => (
                      <span
                        key={index}
                        className={`h-1.5 flex-1 rounded-full ${
                          index < progress.step ? "bg-primary" : "bg-muted"
                        }`}
                      />
                    ))}
                  </div>

                  <Link
                    to="/scan/$slug"
                    params={{ slug: entry.slug }}
                    className="mt-3 inline-flex text-sm font-semibold text-primary underline-offset-4 hover:underline"
                  >
                    View full case detail
                  </Link>

                  <p className="mt-3 text-xs text-muted-foreground">
                    Last update:{" "}
                    {new Date(entry.updatedAt).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                    {entry.reportedAt
                      ? ` · marked submitted ${new Date(entry.reportedAt).toLocaleDateString()}`
                      : ""}
                    {entry.resolvedAt
                      ? ` · outcome confirmed ${new Date(entry.resolvedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
