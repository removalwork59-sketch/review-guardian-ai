import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ClipboardPaste,
  Loader2,
  MapPin,
  RefreshCw,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";

import { StarRating } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { WorkspaceShell } from "@/components/workspace-shell";
import { useReviewJob } from "@/hooks/use-review-job";
import { looksLikeUrl } from "@/lib/platforms";
import {
  cancelReviewJob,
  retryReviewJob,
  selectReviewCandidate,
  startReviewJob,
} from "@/lib/review-jobs.functions";
import type { ReviewJobView } from "@/lib/review-jobs.functions";
import { JOB_ACTIVE_STATUSES, JOB_STATUS_LABELS } from "@/lib/state-machines";
import type { ReviewJobStatus } from "@/lib/state-machines";

const searchSchema = z.object({
  job: z.string().uuid().optional(),
  url: z.string().max(2048).optional(),
});

export const Route = createFileRoute("/app/reviews/new")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({ meta: [{ title: "Add review — Removal Work" }] }),
  component: NewReviewPage,
});

const FINISHED: readonly ReviewJobStatus[] = ["report_ready", "needs_human_review", "completed"];

const STEPS: Array<{ label: string; statuses: ReviewJobStatus[] }> = [
  { label: "Link received", statuses: ["queued"] },
  { label: "Business found", statuses: ["discovering", "awaiting_selection"] },
  { label: "Exact review identified", statuses: ["identified", "fetching"] },
  { label: "Policy analysis (OpenAI + Claude)", statuses: ["analyzing"] },
  { label: "Evidence verified", statuses: ["evidence_ready"] },
  { label: "Decision ready", statuses: ["report_ready", "needs_human_review", "completed"] },
];

function stepIndex(status: ReviewJobStatus) {
  return STEPS.findIndex((step) => step.statuses.includes(status));
}

function NewReviewPage() {
  const { job: jobId, url: initialUrl } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const start = useServerFn(startReviewJob);
  const select = useServerFn(selectReviewCandidate);
  const retry = useServerFn(retryReviewJob);
  const cancel = useServerFn(cancelReviewJob);

  const [url, setUrl] = useState(initialUrl ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);
  const autoStarted = useRef(false);

  const job = useReviewJob(jobId ?? null);
  const view = job.data?.ok ? job.data.job : null;

  async function begin(link: string) {
    const value = link.trim();
    if (!looksLikeUrl(value)) {
      setError({
        message: "That doesn't look like a link yet.",
        hint: "Copy the whole link, starting with https://",
      });
      return;
    }
    setBusy(true);
    setError(null);
    const result = await start({ data: { url: value } }).catch(() => null);
    setBusy(false);
    if (!result) {
      setError({ message: "The scan couldn't start.", hint: "Please try again." });
      return;
    }
    if (!result.ok) {
      setError({ message: result.message, hint: result.hint });
      return;
    }
    queryClient.setQueryData(["review-job", result.job.id], result);
    await navigate({ to: "/app/reviews/new", search: { job: result.job.id }, replace: true });
  }

  useEffect(() => {
    if (initialUrl && !jobId && !autoStarted.current) {
      autoStarted.current = true;
      void begin(initialUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl, jobId]);

  useEffect(() => {
    if (view?.caseId && FINISHED.includes(view.status)) {
      const timer = setTimeout(() => {
        void navigate({ to: "/app/reviews/$caseId", params: { caseId: view.caseId as string } });
      }, 1200);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [view?.caseId, view?.status, navigate]);

  async function paste() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setUrl(text.trim());
    } catch {
      setError({
        message: "Your browser didn't allow pasting here.",
        hint: "Long-press the field and choose Paste.",
      });
    }
  }

  async function act(action: () => Promise<{ ok: boolean; message?: string; hint?: string }>) {
    setBusy(true);
    setError(null);
    const result = await action().catch(() => ({
      ok: false,
      message: "That didn't work.",
      hint: "Please try again.",
    }));
    setBusy(false);
    if (!result.ok)
      setError({ message: result.message ?? "That didn't work.", hint: result.hint ?? "" });
    await queryClient.invalidateQueries({ queryKey: ["review-job", jobId] });
  }

  return (
    <WorkspaceShell
      title="Add review"
      description="Paste a Google review or business link. Finding the review, the AI policy check and the evidence all happen automatically."
    >
      <div className="mx-auto grid max-w-3xl gap-5">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void begin(url);
          }}
          className="surface p-4 sm:p-6"
          aria-describedby={error ? "scan-error" : undefined}
        >
          <label htmlFor="review-link" className="text-sm font-semibold text-ink">
            Google review link
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <div className="flex min-h-14 flex-1 items-center gap-3 rounded-xl border border-input bg-card px-4 focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
              <Search className="size-5 shrink-0 text-primary" aria-hidden="true" />
              <input
                id="review-link"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                inputMode="url"
                autoComplete="off"
                autoFocus={!jobId}
                placeholder="https://maps.app.goo.gl/…"
                className="min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => void paste()}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-primary hover:bg-muted"
              >
                <ClipboardPaste className="size-4" aria-hidden="true" />
                <span className="max-sm:sr-only">Paste</span>
              </button>
            </div>
            <Button type="submit" disabled={busy || !url.trim()} className="h-14 px-6 text-base">
              {busy && !view ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              Scan
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
          {error ? (
            <p id="scan-error" role="alert" className="mt-3 text-sm text-danger">
              {error.message} {error.hint}
            </p>
          ) : null}
        </form>

        {jobId && job.isPending ? (
          <div
            className="surface flex items-center gap-3 p-5 text-sm text-muted-foreground"
            role="status"
          >
            <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Loading the scan…
          </div>
        ) : null}
        {job.data && !job.data.ok ? (
          <p role="alert" className="surface p-5 text-sm text-danger">
            {job.data.message} {job.data.hint}
          </p>
        ) : null}

        {view ? (
          <JobPanel
            view={view}
            live={job.live}
            busy={busy}
            onSelect={(reviewId) => void act(() => select({ data: { jobId: view.id, reviewId } }))}
            onRetry={() => void act(() => retry({ data: { jobId: view.id } }))}
            onCancel={() => void act(() => cancel({ data: { jobId: view.id } }))}
          />
        ) : null}
      </div>
    </WorkspaceShell>
  );
}

function JobPanel({
  view,
  live,
  busy,
  onSelect,
  onRetry,
  onCancel,
}: {
  view: ReviewJobView;
  live: boolean;
  busy: boolean;
  onSelect: (reviewId: string) => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const active = JOB_ACTIVE_STATUSES.includes(view.status);
  const current = stepIndex(view.status);
  const finished = FINISHED.includes(view.status);

  return (
    <section className="grid gap-4" aria-live="polite">
      {view.business ? (
        <div className="surface flex flex-wrap items-start justify-between gap-3 p-4 sm:p-5">
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold text-ink">{view.business.name}</p>
            {view.business.address ? (
              <p className="mt-1 flex items-start gap-1.5 text-sm text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {view.business.address}
              </p>
            ) : null}
            {view.business.rating ? (
              <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                <StarRating value={view.business.rating} />
                {view.business.ratingCount?.toLocaleString()} reviews on Google
              </div>
            ) : null}
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {live ? "Live updates" : active ? "Updating…" : ""}
          </span>
        </div>
      ) : null}

      <ol className="surface grid gap-3 p-4 sm:p-5" aria-label="Scan progress">
        {STEPS.map((step, index) => {
          const done = finished || index < current;
          const here =
            index === current &&
            !finished &&
            view.status !== "failed" &&
            view.status !== "cancelled";
          return (
            <li key={step.label} className="flex items-center gap-3 text-sm">
              {done ? (
                <CheckCircle2 className="size-5 text-safe" aria-hidden="true" />
              ) : here ? (
                view.status === "awaiting_selection" ? (
                  <Circle className="size-5 text-warning" aria-hidden="true" />
                ) : (
                  <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
                )
              ) : (
                <Circle className="size-5 text-border" aria-hidden="true" />
              )}
              <span className={done || here ? "font-medium text-ink" : "text-muted-foreground"}>
                {step.label}
              </span>
              {here ? (
                <span className="ml-auto text-xs text-muted-foreground">{view.detail}</span>
              ) : null}
            </li>
          );
        })}
      </ol>

      {view.status === "awaiting_selection" ? (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-lg font-semibold text-ink">Which review did you mean?</h2>
            <span className="text-sm text-muted-foreground">
              {view.candidates.length} real reviews from Google
            </span>
          </div>
          {view.limitation ? (
            <p className="text-sm text-muted-foreground">{view.limitation}</p>
          ) : null}
          {view.candidates.map((review) => (
            <button
              key={review.id}
              type="button"
              disabled={busy}
              onClick={() => onSelect(review.id)}
              className="surface surface-hover w-full p-4 text-left disabled:opacity-60 sm:p-5"
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-sm font-semibold text-ink">{review.authorName}</span>
                <StarRating value={review.rating} showValue={false} />
              </span>
              <span className="mt-1 block text-xs text-muted-foreground">
                {review.relativeTime}
              </span>
              <span className="mt-2 line-clamp-4 block text-sm leading-relaxed text-foreground">
                {review.text || "This reviewer left a rating without any text."}
              </span>
              <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                Check this review <ArrowRight className="size-4" aria-hidden="true" />
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {view.status === "failed" || view.status === "cancelled" ? (
        <div className="surface p-5" role="alert">
          <p className="flex items-center gap-2 font-semibold text-ink">
            <XCircle className="size-5 text-danger" aria-hidden="true" />
            {JOB_STATUS_LABELS[view.status]}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{view.detail}</p>
          {view.limitation ? (
            <p className="mt-2 text-sm text-muted-foreground">{view.limitation}</p>
          ) : null}
          {view.canRetry ? (
            <Button
              type="button"
              variant="outline"
              className="mt-4"
              disabled={busy}
              onClick={onRetry}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Try again
            </Button>
          ) : null}
        </div>
      ) : null}

      {active || view.status === "awaiting_selection" ? (
        <Button
          type="button"
          variant="ghost"
          className="justify-self-start"
          disabled={busy}
          onClick={onCancel}
        >
          Cancel scan
        </Button>
      ) : null}

      {finished && view.caseId ? (
        <Button asChild className="h-12 justify-self-start">
          <Link to="/app/reviews/$caseId" params={{ caseId: view.caseId }}>
            Open the result
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Button>
      ) : null}
    </section>
  );
}
