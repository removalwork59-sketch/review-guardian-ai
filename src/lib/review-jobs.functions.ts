import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { Tables } from "@/integrations/supabase/types";
import { FriendlyError } from "./google.server";
import type { NormalizedBusiness, NormalizedReview } from "./google.server";
import { detectPlatform, PLATFORMS } from "./platforms";
import type { ReviewJobStatus } from "./state-machines";
import { assertWorkspaceRole, ForbiddenError, requireWorkspace } from "./workspace-middleware";

export type JobEvent = {
  fromStatus: string | null;
  toStatus: string;
  detail: string;
  createdAt: string;
};

export type ReviewJobView = {
  id: string;
  status: ReviewJobStatus;
  detail: string;
  sourceUrl: string;
  business: NormalizedBusiness | null;
  candidates: NormalizedReview[];
  candidateSource: string | null;
  limitation: string | null;
  caseId: string | null;
  errorCode: string | null;
  attemptCount: number;
  maxAttempts: number;
  canRetry: boolean;
  createdAt: string;
  updatedAt: string;
  events: JobEvent[];
};

export type JobResult =
  { ok: true; job: ReviewJobView } | { ok: false; message: string; hint: string };

function toView(row: Tables<"review_jobs">, events: JobEvent[] = []): ReviewJobView {
  const candidates = (row.candidates ?? {}) as { source?: string; reviews?: NormalizedReview[] };
  return {
    id: row.id,
    status: row.status as ReviewJobStatus,
    detail: row.detail,
    sourceUrl: row.source_url,
    business: (row.business ?? null) as NormalizedBusiness | null,
    candidates: Array.isArray(candidates.reviews) ? candidates.reviews : [],
    candidateSource: candidates.source ?? null,
    limitation: row.limitation,
    caseId: row.case_id,
    errorCode: row.error_code,
    attemptCount: row.attempt_count,
    maxAttempts: row.max_attempts,
    canRetry: row.status === "failed" && row.attempt_count < row.max_attempts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    events,
  };
}

function failure(error: unknown): { ok: false; message: string; hint: string } {
  if (error instanceof FriendlyError)
    return { ok: false, message: error.message, hint: error.hint };
  if (error instanceof ForbiddenError) return { ok: false, message: error.message, hint: "" };
  console.error("[review-jobs]", error);
  return {
    ok: false,
    message: "Something went wrong with this scan.",
    hint: "Please try again in a moment.",
  };
}

type Db = {
  from: (
    table: "review_jobs" | "review_job_events",
  ) => ReturnType<
    Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"]["from"]
  >;
};

async function readJob(supabase: unknown, workspaceId: string, jobId: string) {
  const client = supabase as Db;
  const { data: job, error } = await client
    .from("review_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  if (!job)
    throw new FriendlyError("That scan couldn't be found.", "It may belong to another workspace.");
  const { data: events } = await client
    .from("review_job_events")
    .select("from_status,to_status,detail,created_at")
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });
  return toView(
    job as Tables<"review_jobs">,
    ((events ?? []) as Array<Tables<"review_job_events">>).map((event) => ({
      fromStatus: event.from_status,
      toStatus: event.to_status,
      detail: event.detail,
      createdAt: event.created_at,
    })),
  );
}

function kick(jobId: string) {
  void import("./review-pipeline.server")
    .then(({ runReviewJob }) => runReviewJob(jobId))
    .catch((error) => console.error("[review-jobs] background run failed", error));
}

const jobIdSchema = z.object({ jobId: z.string().uuid() });

export const startReviewJob = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .inputValidator((input: unknown) =>
    z.object({ url: z.string().trim().min(4).max(2048) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<JobResult> => {
    try {
      assertWorkspaceRole(context.workspaceRole, "member");
      const { consumeRateLimit } = await import("./rate-limit.server");
      if (!consumeRateLimit(`review-job:${context.userId}`, 30, 10 * 60_000)) {
        throw new FriendlyError(
          "You're scanning very quickly.",
          "Please wait a few minutes and try again.",
        );
      }
      const platform = detectPlatform(data.url);
      const info = PLATFORMS[platform];
      if (!info.supported) {
        return {
          ok: false,
          message: info.note,
          hint: "Paste a Google Maps review or business link instead.",
        };
      }
      const { createReviewJob } = await import("./review-pipeline.server");
      const job = await createReviewJob({
        workspaceId: context.workspaceId,
        userId: context.userId,
        url: data.url,
        platform,
      });
      if (job.status === "queued") kick(job.id);
      return { ok: true, job: toView(job) };
    } catch (error) {
      return failure(error);
    }
  });

export const getReviewJob = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .inputValidator((input: unknown) => jobIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<JobResult> => {
    try {
      return { ok: true, job: await readJob(context.supabase, context.workspaceId, data.jobId) };
    } catch (error) {
      return failure(error);
    }
  });

export const listRecentReviewJobs = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .handler(async ({ context }): Promise<ReviewJobView[]> => {
    const { data, error } = await context.supabase
      .from("review_jobs")
      .select("*")
      .eq("workspace_id", context.workspaceId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return (data ?? []).map((row) => toView(row));
  });

export const selectReviewCandidate = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .inputValidator((input: unknown) =>
    z.object({ jobId: z.string().uuid(), reviewId: z.string().min(1).max(512) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<JobResult> => {
    try {
      assertWorkspaceRole(context.workspaceRole, "member");
      // Authorize through RLS first, then act with the server client.
      await readJob(context.supabase, context.workspaceId, data.jobId);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("review_jobs")
        .select("*")
        .eq("id", data.jobId)
        .eq("workspace_id", context.workspaceId)
        .single();
      if (error) throw error;
      const { selectCandidate } = await import("./review-pipeline.server");
      const updated = await selectCandidate(row, data.reviewId);
      kick(updated.id);
      return { ok: true, job: toView(updated) };
    } catch (error) {
      return failure(error);
    }
  });

export const retryReviewJob = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .inputValidator((input: unknown) => jobIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<JobResult> => {
    try {
      assertWorkspaceRole(context.workspaceRole, "member");
      const current = await readJob(context.supabase, context.workspaceId, data.jobId);
      if (current.status !== "failed")
        throw new FriendlyError("Only a scan that couldn't finish can be retried.");
      if (!current.canRetry) {
        throw new FriendlyError(
          "This scan has used all its retries.",
          "Start a new scan for this link.",
        );
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("review_jobs")
        .update({ status: "queued", detail: "Retrying", next_attempt_at: new Date().toISOString() })
        .eq("id", data.jobId)
        .eq("workspace_id", context.workspaceId)
        .eq("status", "failed")
        .select("*")
        .single();
      if (error) throw error;
      const { writeAudit } = await import("./audit.server");
      await writeAudit({
        workspaceId: context.workspaceId,
        actorId: context.userId,
        action: "review_job.retried",
        entityType: "review_job",
        entityId: data.jobId,
      });
      kick(row.id);
      return { ok: true, job: toView(row) };
    } catch (error) {
      return failure(error);
    }
  });

export const cancelReviewJob = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .inputValidator((input: unknown) => jobIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<JobResult> => {
    try {
      assertWorkspaceRole(context.workspaceRole, "member");
      const current = await readJob(context.supabase, context.workspaceId, data.jobId);
      if (
        ["completed", "cancelled", "report_ready", "needs_human_review"].includes(current.status)
      ) {
        throw new FriendlyError("This scan has already finished.");
      }
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = await supabaseAdmin
        .from("review_jobs")
        .update({ status: "cancelled", detail: "Cancelled", lease_expires_at: null })
        .eq("id", data.jobId)
        .eq("workspace_id", context.workspaceId)
        .select("*")
        .single();
      if (error) throw error;
      const { writeAudit } = await import("./audit.server");
      await writeAudit({
        workspaceId: context.workspaceId,
        actorId: context.userId,
        action: "review_job.cancelled",
        entityType: "review_job",
        entityId: data.jobId,
      });
      return { ok: true, job: toView(row) };
    } catch (error) {
      return failure(error);
    }
  });
