/**
 * Review-job and report state machines. The database enforces the same transitions
 * (review_job_transition_allowed / report_transition_allowed); keep both in sync.
 */

export const REVIEW_JOB_STATUSES = [
  "queued",
  "discovering",
  "awaiting_selection",
  "identified",
  "fetching",
  "analyzing",
  "evidence_ready",
  "report_ready",
  "needs_human_review",
  "completed",
  "failed",
  "cancelled",
] as const;

export type ReviewJobStatus = (typeof REVIEW_JOB_STATUSES)[number];

const JOB_TRANSITIONS: Record<ReviewJobStatus, readonly ReviewJobStatus[]> = {
  queued: ["discovering"],
  discovering: ["identified", "awaiting_selection"],
  awaiting_selection: ["identified"],
  identified: ["fetching", "analyzing"],
  fetching: ["analyzing"],
  analyzing: ["evidence_ready", "needs_human_review"],
  evidence_ready: ["report_ready", "completed", "needs_human_review"],
  report_ready: ["completed"],
  needs_human_review: ["completed"],
  completed: [],
  failed: ["queued"],
  cancelled: [],
};

const JOB_TERMINAL: readonly ReviewJobStatus[] = ["completed", "cancelled"];

export function canTransitionJob(from: ReviewJobStatus, to: ReviewJobStatus) {
  if (from === to) return true;
  if ((to === "failed" || to === "cancelled") && !JOB_TERMINAL.includes(from)) return true;
  return JOB_TRANSITIONS[from].includes(to);
}

/** Statuses in which a job is still being worked on by the pipeline. */
export const JOB_ACTIVE_STATUSES: readonly ReviewJobStatus[] = [
  "queued",
  "discovering",
  "identified",
  "fetching",
  "analyzing",
  "evidence_ready",
];

export const JOB_STATUS_LABELS: Record<ReviewJobStatus, string> = {
  queued: "Queued",
  discovering: "Finding the business",
  awaiting_selection: "Pick the review",
  identified: "Review identified",
  fetching: "Reading the review",
  analyzing: "Checking policy",
  evidence_ready: "Evidence ready",
  report_ready: "Report ready",
  needs_human_review: "Needs your judgement",
  completed: "Done",
  failed: "Couldn't finish",
  cancelled: "Cancelled",
};

export const REPORT_STATUSES = [
  "draft",
  "ready",
  "submitted",
  "processing",
  "decision",
  "removed",
  "not_removed",
  "escalated",
  "appeal_available",
  "appeal_submitted",
  "appeal_result",
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number];

const REPORT_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  draft: ["ready"],
  ready: ["draft", "submitted"],
  submitted: ["processing", "decision"],
  processing: ["decision", "escalated"],
  escalated: ["decision"],
  decision: ["removed", "not_removed"],
  not_removed: ["appeal_available", "escalated"],
  appeal_available: ["appeal_submitted"],
  appeal_submitted: ["appeal_result"],
  appeal_result: ["removed", "not_removed"],
  removed: [],
};

export function canTransitionReport(from: ReportStatus, to: ReportStatus) {
  return from === to || REPORT_TRANSITIONS[from].includes(to);
}

export function nextReportStatuses(from: ReportStatus): readonly ReportStatus[] {
  return REPORT_TRANSITIONS[from];
}

/** Sources that count as Google actually deciding; required before a report can be "removed". */
export const GOOGLE_DECISION_SOURCES = [
  "google_decision_notice",
  "google_support_case",
  "google_legal_decision",
] as const;

export type GoogleDecisionSource = (typeof GOOGLE_DECISION_SOURCES)[number];

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  draft: "Draft",
  ready: "Ready to report",
  submitted: "Reported to Google",
  processing: "Google is reviewing",
  decision: "Google decided",
  removed: "Removed by Google",
  not_removed: "Google kept it",
  escalated: "Escalated",
  appeal_available: "Appeal available",
  appeal_submitted: "Appeal submitted",
  appeal_result: "Appeal decided",
};

export const REPORT_STATUS_TONE: Record<
  ReportStatus,
  "neutral" | "info" | "warning" | "safe" | "danger"
> = {
  draft: "neutral",
  ready: "info",
  submitted: "info",
  processing: "warning",
  decision: "warning",
  removed: "safe",
  not_removed: "danger",
  escalated: "warning",
  appeal_available: "warning",
  appeal_submitted: "info",
  appeal_result: "warning",
};

/** Failure codes the worker retries automatically, with backoff, while attempts remain. */
export const RETRYABLE_JOB_ERROR_CODES: readonly string[] = [
  "rate_limited",
  "provider_unavailable",
  "ai_unavailable",
];

const SETTLED_JOB_STATUSES: readonly string[] = [
  "completed",
  "report_ready",
  "needs_human_review",
  "cancelled",
];

/**
 * True when a review job needs nothing more from the worker: it finished, or it failed in a way
 * that will not be retried automatically. A person can still retry such a failure by hand.
 */
export function isJobSettled(job: {
  status: string;
  errorCode: string | null;
  attemptCount: number;
  maxAttempts: number;
}) {
  if (SETTLED_JOB_STATUSES.includes(job.status)) return true;
  if (job.status !== "failed") return false;
  const retriesAutomatically =
    job.errorCode !== null &&
    RETRYABLE_JOB_ERROR_CODES.includes(job.errorCode) &&
    job.attemptCount < job.maxAttempts;
  return !retriesAutomatically;
}
