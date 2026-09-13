import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { parseUrlList } from "./case-types";
import { FriendlyError } from "./google.server";
import type { ReviewJobStatus } from "./state-machines";
import { assertWorkspaceRole, requireWorkspace } from "./workspace-middleware";

export const MAX_BULK_URLS = 25;

const FINISHED: readonly string[] = [
  "completed",
  "report_ready",
  "needs_human_review",
  "cancelled",
];

export type BulkJobItem = {
  id: string;
  position: number;
  sourceUrl: string;
  jobId: string | null;
  status: ReviewJobStatus;
  detail: string;
  businessName: string | null;
  caseId: string | null;
  canRetry: boolean;
};

export type BulkJob = {
  id: string;
  status: "running" | "completed" | "cancelled";
  total: number;
  counts: Partial<Record<ReviewJobStatus, number>>;
  items: BulkJobItem[];
  createdAt: string;
};

type ItemRow = {
  id: string;
  position: number;
  source_url: string;
  review_job_id: string | null;
  review_jobs: {
    status: string;
    detail: string;
    business: { name?: string } | null;
    case_id: string | null;
    attempt_count: number;
    max_attempts: number;
  } | null;
};

async function readBulkJob(
  supabase: unknown,
  workspaceId: string,
  bulkJobId: string,
): Promise<BulkJob> {
  const client = supabase as {
    from: (table: string) => {
      select: (columns: string) => {
        eq: (
          column: string,
          value: string,
        ) => {
          eq: (
            column: string,
            value: string,
          ) => {
            maybeSingle: () => Promise<{ data: Record<string, unknown> | null; error: unknown }>;
          };
          order: (
            column: string,
            options: { ascending: boolean },
          ) => Promise<{ data: ItemRow[] | null; error: unknown }>;
        };
      };
    };
  };
  const { data: job, error } = await client
    .from("bulk_jobs")
    .select("id,created_at,cancelled_at,total_items")
    .eq("id", bulkJobId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  if (!job) throw new FriendlyError("That bulk scan couldn't be found.");

  const { data: rows, error: itemError } = await client
    .from("bulk_job_items")
    .select(
      "id,position,source_url,review_job_id,review_jobs(status,detail,business,case_id,attempt_count,max_attempts)",
    )
    .eq("bulk_job_id", bulkJobId)
    .order("position", { ascending: true });
  if (itemError) throw itemError;

  const items: BulkJobItem[] = (rows ?? []).map((row) => ({
    id: row.id,
    position: row.position,
    sourceUrl: row.source_url,
    jobId: row.review_job_id,
    status: (row.review_jobs?.status ?? "queued") as ReviewJobStatus,
    detail: row.review_jobs?.detail ?? "Queued",
    businessName: row.review_jobs?.business?.name ?? null,
    caseId: row.review_jobs?.case_id ?? null,
    canRetry:
      row.review_jobs?.status === "failed" &&
      (row.review_jobs?.attempt_count ?? 0) < (row.review_jobs?.max_attempts ?? 0),
  }));
  const counts: BulkJob["counts"] = {};
  for (const item of items) counts[item.status] = (counts[item.status] ?? 0) + 1;
  const done = items.every(
    (item) => FINISHED.includes(item.status) || (item.status === "failed" && !item.canRetry),
  );

  return {
    id: String(job["id"]),
    status: job["cancelled_at"] ? "cancelled" : done ? "completed" : "running",
    total: Number(job["total_items"] ?? items.length),
    counts,
    items,
    createdAt: String(job["created_at"]),
  };
}

function kickAll(jobIds: string[]) {
  void import("./review-pipeline.server")
    .then(({ runReviewJob }) => Promise.all(jobIds.map((id) => runReviewJob(id))))
    .catch((error) => console.error("[bulk] background runs failed", error));
}

const bulkIdSchema = z.object({ bulkJobId: z.string().uuid() });

export const createBulkJob = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .inputValidator((input: unknown) =>
    z.object({ text: z.string().min(4).max(20_000) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<BulkJob> => {
    assertWorkspaceRole(context.workspaceRole, "member");
    const { consumeRateLimit } = await import("./rate-limit.server");
    if (!consumeRateLimit(`bulk:${context.userId}`, 5, 60 * 60_000)) {
      throw new FriendlyError("Too many bulk scans in the last hour.", "Please try again later.");
    }
    const { canonicalizeUrl, createReviewJob } = await import("./review-pipeline.server");
    const unique = [
      ...new Map(
        parseUrlList(data.text)
          .filter((row) => row.valid)
          .map((row) => [canonicalizeUrl(row.url), row.url.trim()] as const),
      ).entries(),
    ].slice(0, MAX_BULK_URLS);
    if (unique.length === 0) throw new FriendlyError("No supported Google links were found.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: bulk, error } = await supabaseAdmin
      .from("bulk_jobs")
      .insert({
        workspace_id: context.workspaceId,
        created_by: context.userId,
        status: "running",
        total_items: unique.length,
      })
      .select("id")
      .single();
    if (error) throw error;

    const jobIds: string[] = [];
    for (const [position, [canonicalUrl, sourceUrl]] of unique.entries()) {
      const job = await createReviewJob({
        workspaceId: context.workspaceId,
        userId: context.userId,
        url: sourceUrl,
        platform: "google",
        bulkJobId: bulk.id,
        position,
      });
      jobIds.push(job.id);
      const { error: itemError } = await supabaseAdmin.from("bulk_job_items").insert({
        bulk_job_id: bulk.id,
        workspace_id: context.workspaceId,
        position,
        source_url: sourceUrl,
        canonical_url: canonicalUrl,
        review_job_id: job.id,
      });
      if (itemError) throw itemError;
    }

    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      action: "bulk_job.created",
      entityType: "bulk_job",
      entityId: bulk.id,
      metadata: { items: unique.length },
    });
    // Each link is an independent job; the pipeline's concurrency limit paces them.
    kickAll(jobIds);
    return readBulkJob(context.supabase, context.workspaceId, bulk.id);
  });

export const getBulkJob = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .inputValidator((input: unknown) => bulkIdSchema.parse(input))
  .handler(async ({ data, context }) =>
    readBulkJob(context.supabase, context.workspaceId, data.bulkJobId),
  );

export const getLatestBulkJob = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .handler(async ({ context }): Promise<BulkJob | null> => {
    const { data } = await context.supabase
      .from("bulk_jobs")
      .select("id")
      .eq("workspace_id", context.workspaceId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? readBulkJob(context.supabase, context.workspaceId, data.id) : null;
  });

export const cancelBulkJob = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .inputValidator((input: unknown) => bulkIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<BulkJob> => {
    assertWorkspaceRole(context.workspaceRole, "member");
    const current = await readBulkJob(context.supabase, context.workspaceId, data.bulkJobId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cancellable = current.items
      .filter(
        (item) => item.jobId && ["queued", "awaiting_selection", "failed"].includes(item.status),
      )
      .map((item) => item.jobId as string);
    if (cancellable.length) {
      await supabaseAdmin
        .from("review_jobs")
        .update({
          status: "cancelled",
          detail: "Cancelled with the bulk scan",
          lease_expires_at: null,
        })
        .in("id", cancellable)
        .eq("workspace_id", context.workspaceId);
    }
    await supabaseAdmin
      .from("bulk_jobs")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", data.bulkJobId)
      .eq("workspace_id", context.workspaceId);
    const { writeAudit } = await import("./audit.server");
    await writeAudit({
      workspaceId: context.workspaceId,
      actorId: context.userId,
      action: "bulk_job.cancelled",
      entityType: "bulk_job",
      entityId: data.bulkJobId,
    });
    return readBulkJob(context.supabase, context.workspaceId, data.bulkJobId);
  });

export const retryFailedBulkItems = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .inputValidator((input: unknown) => bulkIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<BulkJob> => {
    assertWorkspaceRole(context.workspaceRole, "member");
    const current = await readBulkJob(context.supabase, context.workspaceId, data.bulkJobId);
    const retry = current.items
      .filter((item) => item.canRetry && item.jobId)
      .map((item) => item.jobId as string);
    if (retry.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("review_jobs")
        .update({ status: "queued", detail: "Retrying", next_attempt_at: new Date().toISOString() })
        .in("id", retry)
        .eq("workspace_id", context.workspaceId)
        .eq("status", "failed");
      kickAll(retry);
    }
    return readBulkJob(context.supabase, context.workspaceId, data.bulkJobId);
  });
