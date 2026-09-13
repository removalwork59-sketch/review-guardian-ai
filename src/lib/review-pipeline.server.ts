/**
 * Single-review pipeline (server only). Each pasted link becomes a durable review job:
 *
 *   queued → discovering → (awaiting_selection →) identified → analyzing → evidence_ready
 *          → report_ready | needs_human_review | completed        (any step → failed → queued)
 *
 * Every transition is validated here and again by the database, which also records it. Work runs
 * in-process with bounded concurrency; a lease lets the worker resume jobs after a crash, and
 * retryable provider failures are re-queued with exponential backoff up to max_attempts.
 */
import { createHash } from "node:crypto";

import type { Json, Tables, TablesUpdate } from "@/integrations/supabase/types";
import { FriendlyError } from "./google.server";
import type { NormalizedBusiness, NormalizedReview } from "./google.server";
import type { ReviewAnalysis } from "./analysis-types";
import { logEvent } from "./logger.server";
import { canTransitionJob } from "./state-machines";
import type { ReviewJobStatus } from "./state-machines";
import type { ReviewSource } from "./review-resolver.server";

type JobRow = Tables<"review_jobs">;
type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export type JobCandidates = { source: ReviewSource; reviews: NormalizedReview[] };

const LEASE_MS = 5 * 60_000;
const MAX_ATTEMPTS = 5;
export const RETRYABLE_ERROR_CODES = ["rate_limited", "provider_unavailable", "ai_unavailable"];
const CONCURRENCY = Math.max(1, Number(process.env["REVIEW_PIPELINE_CONCURRENCY"] ?? 3));

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function sha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

// ---------------------------------------------------------------------------------------------
// Concurrency
// ---------------------------------------------------------------------------------------------
let activeRuns = 0;
const waiting: Array<() => void> = [];

async function withSlot<T>(task: () => Promise<T>): Promise<T> {
  while (activeRuns >= CONCURRENCY) {
    await new Promise<void>((resolve) => waiting.push(resolve));
  }
  activeRuns += 1;
  try {
    return await task();
  } finally {
    activeRuns -= 1;
    waiting.shift()?.();
  }
}

export function pipelineLoad() {
  return { active: activeRuns, waiting: waiting.length, concurrency: CONCURRENCY };
}

// ---------------------------------------------------------------------------------------------
// Job persistence helpers
// ---------------------------------------------------------------------------------------------
export function canonicalizeUrl(raw: string) {
  try {
    const url = new URL(raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.trim();
  }
}

async function loadJob(id: string) {
  const db = await admin();
  const { data, error } = await db.from("review_jobs").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data;
}

async function transition(
  job: JobRow,
  to: ReviewJobStatus,
  patch: TablesUpdate<"review_jobs"> = {},
): Promise<JobRow> {
  const from = job.status as ReviewJobStatus;
  if (!canTransitionJob(from, to))
    throw new Error(`Invalid review job transition ${from} -> ${to}`);
  const db = await admin();
  const { data, error } = await db
    .from("review_jobs")
    .update({ ...patch, status: to })
    .eq("id", job.id)
    .eq("status", from)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Review job ${job.id} changed while it was being processed`);
  logEvent("review_job.transition", { job: job.id, from, to });
  return data;
}

async function notify(job: JobRow, type: string, title: string, body: string, link: string) {
  const db = await admin();
  const { error } = await db.from("notifications").insert({
    user_id: job.created_by,
    workspace_id: job.workspace_id,
    type,
    title,
    body,
    link,
  });
  if (error) console.error("[review-job] notification failed", error.code, error.message);
}

/** Creates a job, or returns the one already created for the same link in the last 5 minutes. */
export async function createReviewJob(input: {
  workspaceId: string;
  userId: string;
  url: string;
  platform: string;
  bulkJobId?: string;
  position?: number;
}): Promise<JobRow> {
  const db = await admin();
  const canonical = canonicalizeUrl(input.url);
  const key = input.bulkJobId
    ? `bulk:${input.bulkJobId}:${input.position ?? 0}`
    : sha256(`${canonical}|${Math.floor(Date.now() / (5 * 60_000))}`);

  const { data: existing } = await db
    .from("review_jobs")
    .select("*")
    .eq("workspace_id", input.workspaceId)
    .eq("idempotency_key", key)
    .maybeSingle();
  if (existing) return existing;

  const { data, error } = await db
    .from("review_jobs")
    .insert({
      workspace_id: input.workspaceId,
      created_by: input.userId,
      idempotency_key: key,
      source_url: input.url.trim(),
      canonical_url: canonical,
      platform: input.platform,
      max_attempts: MAX_ATTEMPTS,
      detail: "Queued",
    })
    .select("*")
    .single();
  if (error?.code === "23505") {
    const { data: raced } = await db
      .from("review_jobs")
      .select("*")
      .eq("workspace_id", input.workspaceId)
      .eq("idempotency_key", key)
      .single();
    if (raced) return raced;
  }
  if (error) throw error;

  const { writeAudit } = await import("./audit.server");
  await writeAudit({
    workspaceId: input.workspaceId,
    actorId: input.userId,
    action: "review_job.created",
    entityType: "review_job",
    entityId: data.id,
    metadata: { platform: input.platform, bulk: Boolean(input.bulkJobId) },
  });
  return data;
}

/** Atomically takes a runnable job for this process (no-op if another run holds it). */
async function claimJob(id: string): Promise<JobRow | null> {
  const job = await loadJob(id);
  if (!job) return null;
  const leaseFree = !job.lease_expires_at || new Date(job.lease_expires_at).getTime() < Date.now();
  if (!leaseFree || !["queued", "identified"].includes(job.status)) return null;
  if (job.attempt_count >= job.max_attempts) return null;

  const db = await admin();
  const { data } = await db
    .from("review_jobs")
    .update({
      attempt_count: job.attempt_count + 1,
      lease_expires_at: new Date(Date.now() + LEASE_MS).toISOString(),
      started_at: job.started_at ?? new Date().toISOString(),
    })
    .eq("id", id)
    .eq("status", job.status)
    .eq("attempt_count", job.attempt_count)
    .select("*")
    .maybeSingle();
  return data ?? null;
}

// ---------------------------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------------------------
async function upsertLocation(workspaceId: string, business: NormalizedBusiness) {
  const db = await admin();
  const { data, error } = await db
    .from("review_locations")
    .upsert(
      {
        workspace_id: workspaceId,
        platform: "google",
        place_id: business.placeId,
        name: business.name,
        address: business.address,
        category: business.category,
        maps_uri: business.mapsUri,
        rating: business.rating,
        rating_count: business.ratingCount,
      },
      { onConflict: "workspace_id,platform,place_id" },
    )
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

async function upsertReviewRecord(
  job: JobRow,
  locationId: string,
  review: NormalizedReview,
  source: ReviewSource,
  chosenByUser: boolean,
) {
  const db = await admin();
  const verified =
    review.identityStatus === "exact_url_match" ||
    review.identityStatus === "official_sync_verified";
  const identityStatus =
    chosenByUser && review.identityStatus === "provider_observed"
      ? "user_selected"
      : review.identityStatus;
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("review_records")
    .upsert(
      {
        workspace_id: job.workspace_id,
        location_id: locationId,
        platform: "google",
        source,
        external_id: review.id,
        review_url: review.reviewUrl,
        canonical_source_url: job.canonical_url,
        author_name: review.authorName,
        author_photo_url: review.authorPhoto,
        rating: review.rating,
        review_text: review.text,
        published_at: review.publishTime || null,
        content_fingerprint: sha256(
          [
            "google",
            locationId,
            review.authorName.trim().toLowerCase(),
            review.rating,
            review.publishTime,
            review.text.trim(),
          ].join(""),
        ),
        identity_status: identityStatus,
        identity_method: review.identityMethod,
        identity_confidence: review.identityConfidence,
        verified_at: verified ? now : null,
        raw_source: review as unknown as Json,
        last_seen_at: now,
        observed_absent_at: null,
      },
      { onConflict: "workspace_id,platform,external_id" },
    )
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

async function discover(job: JobRow): Promise<JobRow> {
  job = await transition(job, "discovering", {
    detail: "Finding the business and the exact review",
    platform: "google",
  });

  const { resolveGoogleReviews } = await import("./review-resolver.server");
  const started = Date.now();
  const resolved = await resolveGoogleReviews(job.source_url, job.workspace_id);
  logEvent("review_job.discovered", {
    job: job.id,
    source: resolved.source,
    reviews: resolved.reviews.length,
    exact: resolved.exactReviewFound,
    ms: Date.now() - started,
  });

  const location = await upsertLocation(job.workspace_id, resolved.business);
  const shared: TablesUpdate<"review_jobs"> = {
    location_id: location.id,
    business: resolved.business as unknown as Json,
    limitation: resolved.limitation,
  };

  if (resolved.reviews.length === 0) {
    const db = await admin();
    await db.from("review_jobs").update(shared).eq("id", job.id);
    throw new FriendlyError(
      "Google isn't sharing review text for this business, so there's nothing to check yet.",
      resolved.limitation ?? "",
      { code: "review_text_unavailable" },
    );
  }

  const exact =
    resolved.exactReviewFound && resolved.reviews.length === 1 ? resolved.reviews[0] : undefined;
  if (!exact) {
    const candidates: JobCandidates = { source: resolved.source, reviews: resolved.reviews };
    return transition(job, "awaiting_selection", {
      ...shared,
      candidates: candidates as unknown as Json,
      detail: "Pick the review you want checked",
    });
  }

  const record = await upsertReviewRecord(job, location.id, exact, resolved.source, false);
  const candidates: JobCandidates = { source: resolved.source, reviews: [exact] };
  return transition(job, "identified", {
    ...shared,
    candidates: candidates as unknown as Json,
    review_record_id: record.id,
    detail: "Google verified the exact review",
  });
}

/** The user picks which of Google's real reviews the link meant. Never guessed for them. */
export async function selectCandidate(job: JobRow, reviewId: string): Promise<JobRow> {
  if (job.status !== "awaiting_selection") {
    throw new FriendlyError("This scan isn't waiting for a review choice any more.");
  }
  const candidates = job.candidates as unknown as Partial<JobCandidates> | null;
  const review = candidates?.reviews?.find((item) => item.id === reviewId);
  if (!review || !job.location_id || !candidates?.source) {
    throw new FriendlyError(
      "That review is no longer in the list.",
      "Start a new scan to refresh it.",
    );
  }
  const record = await upsertReviewRecord(job, job.location_id, review, candidates.source, true);
  return transition(job, "identified", {
    review_record_id: record.id,
    detail: "You picked the review to check",
  });
}

// ---------------------------------------------------------------------------------------------
// Analysis, evidence and report preparation
// ---------------------------------------------------------------------------------------------
type StoredDecision = {
  analysis: ReviewAnalysis;
  agreement: "agree" | "disagree" | "single_model";
  models: string[];
  supportingEvidence: Array<{ content: string; start: number; end: number }>;
  droppedEvidence: number;
};

function readStoredDecision(output: Json | undefined): StoredDecision | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const value = output as Record<string, unknown>;
  if (!value["analysis"] || !Array.isArray(value["supportingEvidence"])) return null;
  return value as unknown as StoredDecision;
}

function recordToReview(record: Tables<"review_records">): NormalizedReview {
  const raw = (record.raw_source ?? {}) as Partial<NormalizedReview>;
  return {
    id: record.external_id,
    authorName: record.author_name,
    authorPhoto: record.author_photo_url,
    rating: Number(record.rating ?? 0),
    text: record.review_text,
    relativeTime: raw.relativeTime ?? "",
    publishTime: record.published_at ?? "",
    reviewUrl: record.review_url,
    identityStatus:
      record.identity_status === "exact_url_match" ||
      record.identity_status === "official_sync_verified"
        ? record.identity_status
        : "provider_observed",
    identityMethod: (raw.identityMethod ??
      "provider_resource_name") as NormalizedReview["identityMethod"],
    identityConfidence: record.identity_confidence,
  };
}

function buildReportBody(analysis: ReviewAnalysis, quotes: StoredDecision["supportingEvidence"]) {
  return [
    analysis.policyReasoning,
    quotes.length
      ? `Quoted from the review:\n${quotes.map((quote) => `• "${quote.content.replace(/^["“]|["”]$/g, "")}"`).join("\n")}`
      : "",
    analysis.recommendedReportReason ? `Reason: ${analysis.recommendedReportReason}` : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

async function analyze(job: JobRow): Promise<JobRow> {
  const db = await admin();
  if (!job.review_record_id || !job.location_id || !job.business) {
    throw new Error(`Review job ${job.id} has no identified review to analyze`);
  }
  const locationId = job.location_id;
  const { data: record, error: recordError } = await db
    .from("review_records")
    .select("*")
    .eq("id", job.review_record_id)
    .eq("workspace_id", job.workspace_id)
    .single();
  if (recordError) throw recordError;

  const business = job.business as unknown as NormalizedBusiness;
  const review = recordToReview(record);
  if (job.status === "identified" || job.status === "fetching") {
    job = await transition(job, "analyzing", {
      detail: "Checking the review against Google's content policy",
      lease_expires_at: new Date(Date.now() + LEASE_MS).toISOString(),
    });
  }

  const { analyzeReviewDetailed, POLICY_VERSION, PROMPT_VERSION } =
    await import("./analysis.server");
  const inputHash = sha256(
    [
      PROMPT_VERSION,
      POLICY_VERSION,
      record.content_fingerprint,
      business.name,
      business.category,
    ].join("|"),
  );

  // Reuse a completed decision for identical input instead of paying for the models again.
  const { data: previous } = await db
    .from("ai_runs")
    .select("output")
    .eq("workspace_id", job.workspace_id)
    .eq("input_hash", inputHash)
    .eq("stage", "final_decision")
    .eq("status", "completed")
    .eq("prompt_version", PROMPT_VERSION)
    .eq("policy_version", POLICY_VERSION)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const runs: Array<{
    stage: string;
    provider: string;
    model: string;
    status: "completed" | "failed";
    durationMs: number;
    output: unknown;
    confidence: number | null;
    errorCode: string | null;
  }> = [];

  let decision = readStoredDecision(previous?.output);
  const reused = Boolean(decision);
  if (!decision) {
    try {
      const run = await analyzeReviewDetailed(business, review, {
        onStage: (stage) => runs.push(stage),
      });
      decision = {
        analysis: run.analysis,
        agreement: run.agreement,
        models: run.models,
        supportingEvidence: run.supportingEvidence,
        droppedEvidence: run.droppedEvidence,
      };
    } finally {
      if (runs.length) {
        await db.from("ai_runs").insert(
          runs.map((stage) => ({
            workspace_id: job.workspace_id,
            job_id: job.id,
            review_record_id: record.id,
            stage: stage.stage,
            provider: stage.provider,
            model: stage.model,
            prompt_version: PROMPT_VERSION,
            policy_version: POLICY_VERSION,
            input_hash: inputHash,
            output: (stage.stage === "final_decision" && stage.status === "completed" && decision
              ? decision
              : (stage.output ?? {})) as Json,
            confidence: stage.confidence,
            duration_ms: stage.durationMs,
            status: stage.status,
            error_code: stage.errorCode,
          })),
        );
      }
    }
  }
  const analysis = decision.analysis;
  logEvent("review_job.analyzed", {
    job: job.id,
    reused,
    verdict: analysis.verdict,
    agreement: decision.agreement,
    droppedEvidence: decision.droppedEvidence,
  });

  const caseDecision =
    analysis.verdict === "strong_candidate" || analysis.verdict === "possible_candidate"
      ? "reportable"
      : analysis.verdict === "needs_human_review"
        ? "needs_human_review"
        : "not_reportable";

  const { data: policy } = await db
    .from("policy_versions")
    .select("id")
    .eq("platform", "google")
    .eq("version", POLICY_VERSION)
    .maybeSingle();

  const { data: caseRow, error: caseError } = await db
    .from("review_cases")
    .upsert(
      {
        workspace_id: job.workspace_id,
        location_id: locationId,
        review_record_id: record.id,
        job_id: job.id,
        policy_version_id: policy?.id ?? null,
        created_by: job.created_by,
        decision: caseDecision,
        verdict: analysis.verdict,
        violation_category: analysis.violationCategory,
        headline: analysis.headline,
        plain_summary: analysis.plainSummary,
        confidence: analysis.confidence,
        severity: analysis.severity,
        rejection_risk: analysis.rejectionRisk,
        model_agreement: decision.agreement,
        analysis: analysis as unknown as Json,
        dismissed_at: null,
      },
      { onConflict: "workspace_id,review_record_id" },
    )
    .select("id")
    .single();
  if (caseError) throw caseError;

  if (runs.length) {
    await db
      .from("ai_runs")
      .update({ case_id: caseRow.id })
      .eq("job_id", job.id)
      .is("case_id", null);
  }

  // Evidence package: only quotes verified against the stored review text are "supporting".
  await db.from("evidence_items").delete().eq("case_id", caseRow.id);
  const common = {
    workspace_id: job.workspace_id,
    case_id: caseRow.id,
    review_record_id: record.id,
    source: "ai_analysis",
    source_url: record.review_url,
  };
  const evidenceRows = [
    ...decision.supportingEvidence.map((item, position) => ({
      ...common,
      kind: "supporting",
      policy_category: analysis.violationCategory,
      content: item.content,
      excerpt_start: item.start,
      excerpt_end: item.end,
      verified: true,
      position,
    })),
    ...analysis.counterEvidence.map((content, position) => ({
      ...common,
      kind: "counter",
      content,
      position,
    })),
    ...analysis.missingEvidence.map((content, position) => ({
      ...common,
      kind: "missing",
      content,
      position,
    })),
  ];
  if (evidenceRows.length) {
    const { error: evidenceError } = await db.from("evidence_items").insert(evidenceRows);
    if (evidenceError) throw evidenceError;
  }

  if (job.status !== "evidence_ready") {
    job = await transition(job, "evidence_ready", {
      case_id: caseRow.id,
      detail: `${decision.supportingEvidence.length} quote(s) verified against the review`,
    });
  }

  if (caseDecision === "reportable") {
    const { data: existingReport } = await db
      .from("reports")
      .select("id")
      .eq("case_id", caseRow.id)
      .limit(1)
      .maybeSingle();
    if (!existingReport) {
      const { data: report, error: reportError } = await db
        .from("reports")
        .insert({
          workspace_id: job.workspace_id,
          case_id: caseRow.id,
          version: 1,
          route: "google_maps_report_review",
          report_reason: analysis.recommendedReportReason,
          report_body: buildReportBody(analysis, decision.supportingEvidence),
          created_by: job.created_by,
          updated_by: job.created_by,
        })
        .select("id")
        .single();
      if (reportError) throw reportError;
      const strongEnough =
        analysis.verdict === "strong_candidate" &&
        analysis.confidence >= 70 &&
        decision.supportingEvidence.length > 0;
      if (strongEnough) {
        await db
          .from("reports")
          .update({ status: "ready", updated_by: job.created_by })
          .eq("id", report.id);
      }
    }
    job = await transition(job, "report_ready", {
      detail: "Evidence and report are ready for Google",
    });
    await notify(
      job,
      "report_ready",
      "A review is ready to report",
      `${business.name}: ${analysis.headline}`,
      `/app/reviews/${caseRow.id}`,
    );
  } else if (caseDecision === "needs_human_review") {
    job = await transition(job, "needs_human_review", {
      detail: "The AI needs your judgement on this one",
    });
    await notify(
      job,
      "needs_human_review",
      "A review needs your judgement",
      `${business.name}: ${analysis.headline}`,
      `/app/reviews/${caseRow.id}`,
    );
  } else {
    job = await transition(job, "completed", { detail: "No policy violation — nothing to report" });
  }
  return job;
}

// ---------------------------------------------------------------------------------------------
// Failure handling, runs and the worker tick
// ---------------------------------------------------------------------------------------------
async function fail(jobId: string, error: unknown) {
  const friendly = error instanceof FriendlyError ? error : null;
  const code = friendly?.code ?? (friendly ? "provider_error" : "internal_error");
  const detail = friendly
    ? [friendly.message, friendly.hint].filter(Boolean).join(" ")
    : "Something went wrong while processing this review.";
  if (!friendly) console.error("[review-job] unexpected failure", error);

  const job = await loadJob(jobId);
  if (!job || ["completed", "cancelled", "failed", "awaiting_selection"].includes(job.status))
    return;

  const retryable = RETRYABLE_ERROR_CODES.includes(code) && job.attempt_count < job.max_attempts;
  const backoffMs = Math.min(15 * 60_000, 30_000 * 2 ** Math.max(0, job.attempt_count - 1));
  const db = await admin();
  await db
    .from("review_jobs")
    .update({
      status: "failed",
      error_code: code,
      detail: retryable ? `${detail} Retrying automatically.` : detail,
      next_attempt_at: new Date(Date.now() + (retryable ? backoffMs : 0)).toISOString(),
      lease_expires_at: null,
    })
    .eq("id", jobId);
  logEvent(
    "review_job.failed",
    { job: jobId, code, retryable, attempt: job.attempt_count },
    "warn",
  );
  if (!retryable) {
    await notify(
      job,
      "review_failed",
      "A review scan couldn't finish",
      detail,
      `/app/reviews/new?job=${jobId}`,
    );
  }
}

export async function runReviewJob(jobId: string, options: { claimed?: boolean } = {}) {
  await withSlot(async () => {
    const job = options.claimed ? await loadJob(jobId) : await claimJob(jobId);
    if (!job) return;
    const started = Date.now();
    try {
      let current = job;
      if (current.status === "queued" || current.status === "discovering") {
        current = await discover(current);
      }
      if (["identified", "fetching", "analyzing", "evidence_ready"].includes(current.status)) {
        current = await analyze(current);
      }
      logEvent("review_job.run", { job: jobId, status: current.status, ms: Date.now() - started });
    } catch (error) {
      await fail(jobId, error).catch((failure) =>
        console.error("[review-job] could not record failure", failure),
      );
    } finally {
      const db = await admin();
      await db.from("review_jobs").update({ lease_expires_at: null }).eq("id", jobId);
    }
  });
}

let lastTick: { at: string; claimed: number; requeued: number; expired: number } | null = null;

export function lastWorkerTick() {
  return lastTick;
}

/** One worker pass: re-queue retryable failures, expire abandoned choices, resume leased-out work. */
export async function runWorkerTick() {
  const db = await admin();
  const now = new Date().toISOString();

  const { data: retryable } = await db
    .from("review_jobs")
    .select("id,attempt_count,max_attempts")
    .eq("status", "failed")
    .in("error_code", RETRYABLE_ERROR_CODES)
    .lte("next_attempt_at", now)
    .limit(25);
  let requeued = 0;
  for (const job of retryable ?? []) {
    if (job.attempt_count >= job.max_attempts) continue;
    const { data } = await db
      .from("review_jobs")
      .update({ status: "queued", detail: "Retrying automatically" })
      .eq("id", job.id)
      .eq("status", "failed")
      .select("id");
    requeued += data?.length ?? 0;
  }

  const { data: expired } = await db
    .from("review_jobs")
    .update({ status: "cancelled", detail: "No review was picked within 7 days" })
    .eq("status", "awaiting_selection")
    .lt("updated_at", new Date(Date.now() - 7 * 24 * 60 * 60_000).toISOString())
    .select("id");

  const { data: claimed, error } = await db.rpc("claim_review_jobs", {
    _limit: CONCURRENCY,
    _lease_seconds: LEASE_MS / 1000,
  });
  if (error) throw error;
  await Promise.all((claimed ?? []).map((job) => runReviewJob(job.id, { claimed: true })));

  lastTick = {
    at: new Date().toISOString(),
    claimed: claimed?.length ?? 0,
    requeued,
    expired: expired?.length ?? 0,
  };
  logEvent("worker.tick", lastTick);
  return lastTick;
}
