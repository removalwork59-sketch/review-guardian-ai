import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, FileDown, Star } from "lucide-react";

import { Wordmark } from "@/components/brand";
import { CATEGORY_LABELS } from "@/lib/analysis-types";
import { VERDICT_LABELS } from "@/lib/case-types";
import { PUBLIC_PROGRESS, PUBLIC_PROGRESS_STEPS, getPublicCaseDetail } from "@/lib/public-status.functions";

export const Route = createFileRoute("/scan/$slug")({
  loader: async ({ params }) => {
    const detail = await getPublicCaseDetail({ data: { slug: params.slug } });
    if (!detail) throw notFound();
    return detail;
  },
  errorComponent: () => (
    <div className="page-shell">
      <main className="page-main">
        <h1 className="page-title">This case page is unavailable</h1>
        <p className="page-lede">Please refresh the page and try again.</p>
      </main>
    </div>
  ),
  notFoundComponent: () => (
    <div className="page-shell">
      <main className="page-main">
        <h1 className="page-title">Case not published</h1>
        <p className="page-lede">
          This case is either private or no longer published by its owner.
        </p>
        <Link to="/scan" className="page-back mt-6 inline-flex">
          <ArrowLeft className="size-4" /> Back to the status board
        </Link>
      </main>
    </div>
  ),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [{ title: "Case unavailable — Removal Work" }, { name: "robots", content: "noindex" }],
      };
    }
    const title = `${loaderData.headline} — Removal Work case detail`;
    const description = loaderData.plainSummary.slice(0, 155);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary" },
      ],
    };
  },
  component: PublicCaseDetailPage,
});

function Bullets({ title, items }: { title: string; items?: string[] | undefined }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="mt-5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function PublicCaseDetailPage() {
  const detail = Route.useLoaderData();
  const progress = PUBLIC_PROGRESS[detail.status];
  const analysis = detail.analysis;

  return (
    <div className="page-shell">
      <header className="page-header">
        <Link to="/" aria-label="Removal Work home">
          <Wordmark />
        </Link>
        <Link to="/scan" className="page-back">
          <ArrowLeft className="size-4" /> Status board
        </Link>
      </header>

      <main className="page-main">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {detail.platform === "google" ? "Google Maps" : detail.platform} ·{" "}
          {detail.locationName}
        </p>
        <h1 className="page-title mt-1">{detail.headline}</h1>
        <p className="page-lede">{detail.plainSummary}</p>

        <section className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-bold text-ink">Site</h2>
          <p className="mt-1 text-sm text-ink">{detail.locationName}</p>
          {detail.locationAddress ? (
            <p className="text-sm text-muted-foreground">{detail.locationAddress}</p>
          ) : null}
          {detail.reviewUrl || detail.sourceUrl ? (
            <a
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              href={detail.reviewUrl || detail.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
            >
              Open the listing <ExternalLink className="size-4" />
            </a>
          ) : null}

          <p className="mt-4 text-sm text-ink">{progress.label}</p>
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
          <p className="mt-3 text-xs text-muted-foreground">
            Last update:{" "}
            {new Date(detail.updatedAt).toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-bold text-ink">The review</h2>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-ink">{detail.authorName || "Reviewer"}</span>
            {detail.reviewRating !== null ? (
              <span className="inline-flex items-center gap-1">
                <Star className="size-4 text-warn" aria-hidden />
                {detail.reviewRating}/5
              </span>
            ) : null}
            {detail.reviewRelativeTime ? <span>· {detail.reviewRelativeTime}</span> : null}
          </p>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink">
            {detail.reviewText || "No review text was captured."}
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-base font-bold text-ink">AI policy analysis</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Verdict" value={VERDICT_LABELS[detail.verdict] ?? detail.verdict} />
            <Stat label="Confidence" value={`${detail.confidence}%`} />
            <Stat label="Severity" value={detail.severity || "—"} />
            <Stat
              label="Problem type"
              value={CATEGORY_LABELS[detail.violationCategory] ?? "—"}
            />
          </dl>

          <Bullets title="What supports reporting it" items={analysis?.evidence} />
          <Bullets title="What argues against it" items={analysis?.counterEvidence} />
          <Bullets title="What we still don't know" items={analysis?.missingEvidence} />

          {analysis?.challenge ? (
            <div className="mt-5 rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-sm font-semibold text-ink">The AI argued the other side</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {analysis.challenge}
              </p>
            </div>
          ) : null}

          {analysis?.recommendedAction ? (
            <div className="mt-4 rounded-xl border border-border bg-card p-4">
              <p className="text-sm font-semibold text-ink">Recommended action</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {analysis.recommendedAction}
              </p>
            </div>
          ) : null}
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-muted/40 p-5">
          <h2 className="flex items-center gap-2 text-base font-bold text-ink">
            <FileDown className="size-4 text-primary" aria-hidden />
            PDF report
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The PDF report for this case can only be downloaded by the owner of the case, from
            their scan reports page.
          </p>
          <Link
            to="/auth"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary underline-offset-4 hover:underline"
          >
            Sign in to download
          </Link>
        </section>

        <p className="mt-8 text-xs text-muted-foreground">
          Statuses on this page are confirmed by the case owner. Google gives no API for report
          outcomes, so nothing here is an automated platform confirmation.
        </p>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold capitalize text-ink">{value}</dd>
    </div>
  );
}
