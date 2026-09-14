import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Loader2, Lock, RefreshCw, Star } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { DECISION_LABELS, VERDICT_LABELS, VERDICT_TONE } from "@/lib/case-types";
import type { CaseRecord } from "@/lib/case-types";
import { errorMessage } from "@/lib/errors";
import { REPORT_STATUS_LABELS, REPORT_STATUS_TONE } from "@/lib/state-machines";
import type { ReportStatus } from "@/lib/state-machines";

const TONE_CLASS: Record<string, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-primary/25 bg-info-soft text-primary",
  warning: "border-warning/30 bg-warning-soft text-warning",
  safe: "border-safe/30 bg-safe-soft text-safe",
  danger: "border-danger/30 bg-danger-soft text-danger",
};

export function Badge({
  tone,
  children,
}: {
  tone: keyof typeof TONE_CLASS | string;
  children: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[tone] ?? TONE_CLASS["neutral"]}`}
    >
      {children}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: string }) {
  return (
    <Badge tone={VERDICT_TONE[verdict] ?? "neutral"}>{VERDICT_LABELS[verdict] ?? verdict}</Badge>
  );
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  return <Badge tone={REPORT_STATUS_TONE[status]}>{REPORT_STATUS_LABELS[status]}</Badge>;
}

/** Summary card; everything actionable lives on the review detail page. */
export function CaseCard({ item }: { item: CaseRecord }) {
  return (
    <Link
      to="/app/reviews/$caseId"
      params={{ caseId: item.id }}
      className="surface surface-hover app-card case-card group block animate-rise"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-semibold text-ink">
            {item.locationName}
          </p>
          <p className="text-sm text-muted-foreground">
            {item.authorName || "Anonymous"}
            {item.reviewRating ? (
              <span className="ml-2 inline-flex items-center gap-1 text-star">
                <Star className="size-3.5 fill-current" aria-hidden="true" />
                <span className="sr-only">Rating </span>
                {item.reviewRating}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <VerdictBadge verdict={item.verdict} />
          {item.report ? <ReportStatusBadge status={item.report.status} /> : null}
          {item.dismissed ? <Badge tone="neutral">Dismissed</Badge> : null}
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground">
        {item.reviewText || "This reviewer left a rating without any text."}
      </p>
      <p className="mt-3 text-sm font-medium text-ink">{item.headline}</p>
      <div className="mt-4 flex items-center justify-between gap-3 text-sm">
        <span className="text-muted-foreground">
          {DECISION_LABELS[item.decision]} · {item.confidence}% sure
        </span>
        <span className="inline-flex items-center gap-1 font-medium text-primary">
          Open
          <ArrowRight
            className="size-4 transition group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface app-empty-state text-center">
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div
      className="surface app-empty-state flex items-center justify-center gap-3 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      {label}
    </div>
  );
}

/** Error state that always shows the real reason the backend gave, not just a generic line. */
export function ErrorState({
  title = "Something didn't load",
  body = "Please try again.",
  error,
  onRetry,
}: {
  title?: string;
  body?: string;
  error?: unknown;
  onRetry?: () => void;
}) {
  const reason = errorMessage(error);
  return (
    <div className="surface app-empty-state text-center" role="alert">
      <AlertTriangle className="mx-auto size-6 text-warning" aria-hidden="true" />
      <p className="mt-2 font-display text-lg font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
      {reason ? (
        <p className="mx-auto mt-3 max-w-xl rounded-lg border border-border bg-muted/40 px-3 py-2 text-left text-sm text-foreground">
          {reason}
        </p>
      ) : null}
      {onRetry ? (
        <Button type="button" variant="outline" className="mt-5" onClick={onRetry}>
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function PermissionDenied({
  body = "You don't have access to this page.",
}: {
  body?: string;
}) {
  return (
    <div className="surface app-empty-state text-center" role="alert">
      <Lock className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
      <p className="mt-2 font-display text-lg font-semibold text-ink">Permission needed</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
