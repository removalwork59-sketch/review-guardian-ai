import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  ClipboardCopy,
  ExternalLink,
  Loader2,
  Scale,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { StarRating } from "@/components/brand";
import {
  Badge,
  ErrorState,
  LoadingState,
  ReportStatusBadge,
  VerdictBadge,
} from "@/components/case-ui";
import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/workspace-shell";
import { CATEGORY_LABELS } from "@/lib/analysis-types";
import { DECISION_LABELS } from "@/lib/case-types";
import type { CaseDetail } from "@/lib/case-types";
import {
  createReportForCase,
  getCaseDetail,
  setCaseDismissed,
  transitionReport,
} from "@/lib/cases.functions";
import type { ActionResult } from "@/lib/cases.functions";
import {
  GOOGLE_DECISION_SOURCES,
  nextReportStatuses,
  REPORT_STATUS_LABELS,
} from "@/lib/state-machines";
import type { GoogleDecisionSource, ReportStatus } from "@/lib/state-machines";

export const Route = createFileRoute("/app/reviews/$caseId")({
  head: () => ({ meta: [{ title: "Review — Removal Work" }] }),
  component: CaseDetailPage,
});

const ACTION_LABELS: Partial<Record<ReportStatus, string>> = {
  ready: "Mark ready to report",
  draft: "Back to draft",
  submitted: "I've reported it on Google",
  processing: "Google is reviewing it",
  decision: "Google has decided",
  escalated: "Escalate",
  removed: "Google removed it",
  not_removed: "Google kept it",
  appeal_available: "An appeal is possible",
  appeal_submitted: "I've submitted the appeal",
  appeal_result: "Appeal decided",
};

const SOURCE_LABELS: Record<GoogleDecisionSource, string> = {
  google_decision_notice: "Google's decision notice or email",
  google_support_case: "Google support case",
  google_legal_decision: "Google legal removal decision",
};

function highlighted(text: string, ranges: Array<{ start: number; end: number }>) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const parts: ReactNode[] = [];
  let cursor = 0;
  for (const range of sorted) {
    if (range.start < cursor || range.end > text.length) continue;
    if (range.start > cursor) parts.push(text.slice(cursor, range.start));
    parts.push(
      <mark key={`${range.start}-${range.end}`} className="rw-highlight">
        {text.slice(range.start, range.end)}
      </mark>,
    );
    cursor = range.end;
  }
  if (cursor < text.length) parts.push(text.slice(cursor));
  return parts;
}

function CaseDetailPage() {
  const { caseId } = Route.useParams();
  const fetchDetail = useServerFn(getCaseDetail);
  const detail = useQuery({
    queryKey: ["case", caseId],
    queryFn: () => fetchDetail({ data: { caseId } }),
  });

  return (
    <WorkspaceShell
      title={detail.data?.locationName ?? "Review"}
      description={detail.data ? DECISION_LABELS[detail.data.decision] : undefined}
      actions={
        <Button asChild variant="ghost">
          <Link to="/app/reviews">
            <ArrowLeft className="size-4" aria-hidden="true" />
            All reviews
          </Link>
        </Button>
      }
    >
      {detail.isPending ? (
        <LoadingState label="Loading the review…" />
      ) : detail.error ? (
        <ErrorState body="We couldn't load this review." onRetry={() => void detail.refetch()} />
      ) : !detail.data ? (
        <ErrorState
          title="Review not found"
          body="It may have been removed or belong to another workspace."
        />
      ) : (
        <CaseBody item={detail.data} />
      )}
    </WorkspaceShell>
  );
}

function CaseBody({ item }: { item: CaseDetail }) {
  const supporting = item.evidence.filter((evidence) => evidence.kind === "supporting");
  const counter = item.evidence.filter((evidence) => evidence.kind === "counter");
  const missing = item.evidence.filter((evidence) => evidence.kind === "missing");
  const ranges = supporting
    .filter((evidence) => evidence.excerptStart !== null && evidence.excerptEnd !== null)
    .map((evidence) => ({
      start: evidence.excerptStart as number,
      end: evidence.excerptEnd as number,
    }));
  const analysis = item.analysis;

  return (
    <div className="rw-grid-2">
      <div className="grid min-w-0 gap-4">
        <section className="surface p-4 sm:p-6" aria-label="The review">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="font-semibold text-ink">{item.authorName || "Anonymous"}</p>
              <p className="text-xs text-muted-foreground">
                {item.reviewPublishedAt
                  ? new Date(item.reviewPublishedAt).toLocaleDateString()
                  : "Date not shared by Google"}
              </p>
            </div>
            {item.reviewRating ? <StarRating value={item.reviewRating} /> : null}
          </div>
          <p className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-foreground">
            {item.reviewText
              ? highlighted(item.reviewText, ranges)
              : "This reviewer left a rating without any text."}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <Badge
              tone={
                ["exact_url_match", "official_sync_verified"].includes(item.identityStatus)
                  ? "safe"
                  : "info"
              }
            >
              {item.identityStatus === "official_sync_verified"
                ? "Verified by Google Business Profile"
                : item.identityStatus === "exact_url_match"
                  ? "Exact review verified"
                  : item.identityStatus === "user_selected"
                    ? "Review chosen by you"
                    : "Observed on Google"}
            </Badge>
            {item.reviewUrl ? (
              <a
                href={item.reviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
              >
                Open on Google <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        </section>

        {analysis ? (
          <section className="surface overflow-hidden" aria-label="AI analysis">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border p-4 sm:px-6">
              <div className="min-w-0">
                <p className="font-semibold text-ink">{analysis.headline}</p>
                <p className="mt-1 text-sm text-muted-foreground">{analysis.plainSummary}</p>
              </div>
              <VerdictBadge verdict={item.verdict} />
            </div>
            <div className="grid gap-5 p-4 sm:p-6">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Problem type" value={CATEGORY_LABELS[item.violationCategory] ?? "—"} />
                <Stat label="Confidence" value={`${item.confidence}%`} />
                <Stat label="Severity" value={capitalize(item.severity)} />
                <Stat
                  label="Models agreed"
                  value={
                    item.modelAgreement === "agree"
                      ? "Yes"
                      : item.modelAgreement === "disagree"
                        ? "No"
                        : "One model"
                  }
                />
              </dl>
              <Block
                icon={<Scale className="size-4 text-primary" aria-hidden="true" />}
                title="Policy reasoning"
              >
                <p className="text-sm leading-relaxed text-foreground">
                  {analysis.policyReasoning}
                </p>
              </Block>
              <Block
                icon={<ShieldCheck className="size-4 text-safe" aria-hidden="true" />}
                title="Verified evidence (quoted from the review)"
              >
                {supporting.length ? (
                  <ul className="grid gap-2">
                    {supporting.map((evidence) => (
                      <li
                        key={evidence.id}
                        className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm"
                      >
                        “{evidence.content}”
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No quote from the review supports a report.
                  </p>
                )}
              </Block>
              <List
                title="What argues against reporting"
                items={counter.map((evidence) => evidence.content)}
              />
              <List
                title="What we still don't know"
                items={missing.map((evidence) => evidence.content)}
              />
              <Block
                icon={<AlertTriangle className="size-4 text-warning" aria-hidden="true" />}
                title="Self-critique"
              >
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {analysis.challenge}
                </p>
              </Block>
              <Block
                icon={<Bot className="size-4 text-primary" aria-hidden="true" />}
                title="AI verification"
              >
                {item.aiRuns.length ? (
                  <ul className="grid gap-1.5 text-sm">
                    {item.aiRuns.map((run) => (
                      <li
                        key={`${run.stage}-${run.createdAt}`}
                        className="flex flex-wrap justify-between gap-2"
                      >
                        <span className="text-foreground">
                          {run.stage.replace(/_/g, " ")} · {run.provider} {run.model}
                        </span>
                        <span
                          className={
                            run.status === "completed" ? "text-muted-foreground" : "text-danger"
                          }
                        >
                          {run.status === "completed"
                            ? `${(run.durationMs / 1000).toFixed(1)}s`
                            : `failed (${run.errorCode ?? "error"})`}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Reused an earlier analysis of the identical review.
                  </p>
                )}
              </Block>
            </div>
          </section>
        ) : null}
      </div>

      <div className="grid min-w-0 gap-4 lg:sticky lg:top-6">
        <ReportPanel item={item} />
        {item.reportEvents.length ? (
          <section className="surface p-4 sm:p-5" aria-label="Status history">
            <h2 className="rw-section-title">Status history</h2>
            <ol className="rw-timeline">
              {item.reportEvents.map((event) => (
                <li key={event.id} className="rw-timeline-item">
                  <p className="text-sm font-medium text-ink">
                    {REPORT_STATUS_LABELS[event.toStatus as ReportStatus] ?? event.toStatus}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(event.createdAt).toLocaleString()}
                  </p>
                  {event.note ? (
                    <p className="mt-1 text-sm text-muted-foreground">{event.note}</p>
                  ) : null}
                  {event.externalReference ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reference: {event.externalReference}
                    </p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ReportPanel({ item }: { item: CaseDetail }) {
  const queryClient = useQueryClient();
  const transition = useServerFn(transitionReport);
  const create = useServerFn(createReportForCase);
  const dismiss = useServerFn(setCaseDismissed);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [reference, setReference] = useState("");
  const [source, setSource] = useState<GoogleDecisionSource | "">("");
  const [copied, setCopied] = useState(false);

  const report = item.reports[0];

  async function run(action: () => Promise<ActionResult>) {
    setBusy(true);
    setMessage(null);
    const result = await action().catch((): ActionResult => ({
      ok: false,
      message: "That didn't work.",
      hint: "Please try again.",
    }));
    setBusy(false);
    if (!result.ok) {
      setMessage(`${result.message} ${result.hint}`.trim());
      return;
    }
    setNote("");
    setReference("");
    setSource("");
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["case", item.id] }),
      queryClient.invalidateQueries({ queryKey: ["cases"] }),
    ]);
  }

  async function copyReason() {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.reportBody || report.reportReason);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setMessage("Copy isn't available in this browser. Select the text instead.");
    }
  }

  return (
    <section className="surface p-4 sm:p-5" aria-label="Report">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="rw-section-title mb-0">Report to Google</h2>
        {report ? <ReportStatusBadge status={report.status} /> : null}
      </div>

      {!report ? (
        item.decision === "not_reportable" ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No policy violation was found, so there's nothing to report. Consider a calm public
            reply instead.
          </p>
        ) : (
          <div className="mt-3 grid gap-3">
            <p className="text-sm text-muted-foreground">
              The AI left this one for your judgement. Prepare a report only if you believe it
              breaks Google's rules.
            </p>
            <Button
              type="button"
              disabled={busy}
              onClick={() => void run(() => create({ data: { caseId: item.id } }))}
            >
              Prepare a report
            </Button>
          </div>
        )
      ) : (
        <div className="mt-3 grid gap-4">
          {report.reportReason ? (
            <div className="rounded-xl border border-border bg-muted/40 p-3.5">
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Reason to give Google
              </p>
              <p className="mt-1 text-sm text-foreground">{report.reportReason}</p>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-primary">Full report text</summary>
                <p className="mt-2 whitespace-pre-line text-muted-foreground">
                  {report.reportBody}
                </p>
              </details>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => void copyReason()}
              >
                <ClipboardCopy className="size-4" aria-hidden="true" />
                {copied ? "Copied" : "Copy report text"}
              </Button>
            </div>
          ) : null}

          {report.status === "ready" || report.status === "draft" ? (
            <ol className="grid gap-2 text-sm text-muted-foreground">
              <li>
                1.{" "}
                {item.reviewUrl ? (
                  <a
                    href={item.reviewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-primary hover:underline"
                  >
                    Open the review on Google Maps
                  </a>
                ) : (
                  "Open the review on Google Maps"
                )}{" "}
                and choose “Report review”.
              </li>
              <li>
                2. Pick the reason above and paste the report text if Google asks for details.
              </li>
              <li>3. Come back and record it here.</li>
            </ol>
          ) : null}

          {nextReportStatuses(report.status).length ? (
            <div className="grid gap-3">
              {nextReportStatuses(report.status).includes("removed") ? (
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-ink">
                    Where did Google confirm the removal?
                  </span>
                  <select
                    value={source}
                    onChange={(event) => setSource(event.target.value as GoogleDecisionSource)}
                    className="app-select min-h-11"
                  >
                    <option value="">Choose the source…</option>
                    {GOOGLE_DECISION_SOURCES.map((value) => (
                      <option key={value} value={value}>
                        {SOURCE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {["ready", "appeal_available"].includes(report.status) ? (
                <label className="grid gap-1 text-sm">
                  <span className="font-medium text-ink">Google reference (optional)</span>
                  <input
                    value={reference}
                    onChange={(event) => setReference(event.target.value)}
                    maxLength={200}
                    className="app-select min-h-11"
                    placeholder="Case or report number, if Google showed one"
                  />
                </label>
              ) : null}
              <label className="grid gap-1 text-sm">
                <span className="font-medium text-ink">Note (optional)</span>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={1000}
                  rows={2}
                  className="app-textarea"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                {nextReportStatuses(report.status).map((to) => (
                  <Button
                    key={to}
                    type="button"
                    variant={
                      to === "removed" || to === "submitted" || to === "ready"
                        ? "default"
                        : "outline"
                    }
                    disabled={busy || (to === "removed" && !source)}
                    onClick={() =>
                      void run(() =>
                        transition({
                          data: {
                            reportId: report.id,
                            to,
                            ...(note ? { note } : {}),
                            ...(reference ? { externalReference: reference } : {}),
                            ...(to === "removed" && source ? { outcomeSource: source } : {}),
                          },
                        }),
                      )
                    }
                  >
                    {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
                    {ACTION_LABELS[to] ?? REPORT_STATUS_LABELS[to]}
                  </Button>
                ))}
              </div>
            </div>
          ) : report.status === "removed" ? (
            <p className="text-sm text-safe">
              Google removed this review
              {report.decidedAt ? ` on ${new Date(report.decidedAt).toLocaleDateString()}` : ""}.
            </p>
          ) : null}

          <p className="text-xs text-muted-foreground">
            Google doesn't offer an API for reporting reviews, so the report is filed in Google's
            own interface. A review is only marked removed once Google confirms it.
          </p>
        </div>
      )}

      {message ? (
        <p role="alert" className="mt-3 text-sm text-danger">
          {message}
        </p>
      ) : null}

      <div className="mt-4 border-t border-border pt-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() =>
            void run(() => dismiss({ data: { caseId: item.id, dismissed: !item.dismissed } }))
          }
        >
          {item.dismissed ? "Restore this review" : "Dismiss this review"}
        </Button>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function Block({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
        {icon}
        {title}
      </h3>
      {children}
    </div>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-semibold text-ink">{title}</h3>
      <ul className="grid gap-2">
        {items.map((entry) => (
          <li
            key={entry}
            className="rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm text-foreground"
          >
            {entry}
          </li>
        ))}
      </ul>
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
