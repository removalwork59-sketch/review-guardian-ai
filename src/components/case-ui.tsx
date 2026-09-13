import { ExternalLink, Star } from "lucide-react";

import {
  CASE_STATUSES,
  STATUS_LABELS,
  STATUS_SHORT,
  STATUS_TONE,
  VERDICT_LABELS,
  VERDICT_TONE,
} from "@/lib/case-types";
import type { CaseRecord, CaseStatus } from "@/lib/case-types";

const TONE_CLASS: Record<string, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-primary/25 bg-info-soft text-primary",
  warning: "border-warning/30 bg-warning-soft text-warning",
  safe: "border-safe/30 bg-safe-soft text-safe",
  danger: "border-danger/30 bg-danger-soft text-danger",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[STATUS_TONE[status]]}`}
    >
      {STATUS_SHORT[status]}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[VERDICT_TONE[verdict] ?? "neutral"]}`}
    >
      {VERDICT_LABELS[verdict] ?? verdict}
    </span>
  );
}

export function CaseCard({
  item,
  onStatusChange,
  busy,
}: {
  item: CaseRecord;
  onStatusChange: (status: CaseStatus) => void;
  busy: boolean;
}) {
  return (
    <article className="surface animate-rise p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-lg font-semibold text-ink">{item.locationName}</p>
          <p className="text-sm text-muted-foreground">
            {item.authorName || "Anonymous"} · {item.reviewRelativeTime || "date unknown"}
            {item.reviewRating ? (
              <span className="ml-2 inline-flex items-center gap-1 text-star">
                <Star className="size-3.5 fill-current" />
                {item.reviewRating}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={item.verdict} />
          <StatusBadge status={item.status} />
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground">{item.reviewText}</p>
      <p className="mt-3 text-sm font-medium text-ink">{item.headline}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.plainSummary}</p>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground" htmlFor={`status-${item.id}`}>
          Status
        </label>
        <select
          id={`status-${item.id}`}
          value={item.status}
          disabled={busy}
          onChange={(event) => onStatusChange(event.target.value as CaseStatus)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-ink outline-none focus:border-primary disabled:opacity-60"
        >
          {CASE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        {item.reviewUrl ? (
          <a
            href={item.reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open on Google
            <ExternalLink className="size-3.5" />
          </a>
        ) : null}
      </div>
    </article>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface p-10 text-center">
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
