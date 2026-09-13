import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { parseUrlList } from "./case-types";

export const MAX_BULK_URLS = 25;
export const BULK_PASS_SIZE = 3;

const jobIdSchema = z.object({ jobId: z.string().uuid() });

function canonicalize(raw: string) {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.trim();
  }
}

export type BulkJobItem = {
  id: string;
  sourceUrl: string;
  status: "queued" | "discovering" | "identified" | "analyzing" | "report_ready" | "needs_review" | "failed" | "cancelled";
  businessName: string | null;
  detail: string;
  caseId: string | null;
};

export type BulkJob = {
  id: string;
  status: "queued" | "running" | "paused" | "completed" | "cancelled";
  total: number;
  queued: number;
  discovering: number;
  identified: number;
  analyzing: number;
  reportReady: number;
  needsReview: number;
  failed: number;
  pauseReason: string | null;
  items: BulkJobItem[];
};

function toJob(row: any, items: any[]): BulkJob {
  return {
    id: row.id,
    status: row.status,
    total: row.total_items,
    queued: row.queued_count,
    discovering: row.discovering_count,
    identified: row.identified_count,
    analyzing: row.analyzing_count,
    reportReady: row.report_ready_count,
    needsReview: row.needs_review_count,
    failed: row.failed_count,
    pauseReason: row.pause_reason,
    items: items.map((item) => ({
      id: item.id,
      sourceUrl: item.source_url,
      status: item.status,
      businessName: item.business_name,
      detail: item.detail,
      caseId: item.case_id,
    })),
  };
}

async function readOwnedJob(supabase: any, userId: string, jobId: string) {
  const { data: job, error } = await supabase
    .from("bulk_jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", userId)
    .single();
  if (error) throw error;
  const { data: items, error: itemError } = await supabase
    .from("bulk_job_items")
    .select("*")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (itemError) throw itemError;
  return toJob(job, items ?? []);
}

export const createBulkJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ text: z.string().min(4), sourceKind: z.enum(["review", "competitor"]).default("competitor") }).parse(input))
  .handler(async ({ data, context }): Promise<BulkJob> => {
    const parsed = parseUrlList(data.text).filter((item) => item.valid);
    const unique = [...new Map(parsed.map((item) => [canonicalize(item.url), item.url.trim()])).entries()]
      .slice(0, MAX_BULK_URLS);
    if (unique.length === 0) throw new Error("No supported Google links were found.");

    const { data: job, error } = await context.supabase
      .from("bulk_jobs")
      .insert({ user_id: context.userId, total_items: unique.length, queued_count: unique.length })
      .select("id")
      .single();
    if (error) throw error;

    const { error: itemError } = await context.supabase.from("bulk_job_items").insert(
      unique.map(([canonicalSourceUrl, sourceUrl]) => ({
        job_id: job.id,
        user_id: context.userId,
        source_url: sourceUrl,
        canonical_source_url: canonicalSourceUrl,
        source_kind: data.sourceKind,
      })),
    );
    if (itemError) throw itemError;
    await context.supabase.rpc("refresh_bulk_job_counts", { _job_id: job.id });
    return readOwnedJob(context.supabase, context.userId, job.id);
  });

export const getBulkJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => jobIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<BulkJob> =>
    readOwnedJob(context.supabase, context.userId, data.jobId));

export const getLatestBulkJob = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BulkJob | null> => {
    const { data } = await context.supabase
      .from("bulk_jobs")
      .select("id")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? readOwnedJob(context.supabase, context.userId, data.id) : null;
  });

export const runBulkJobPass = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => jobIdSchema.parse(input))
  .handler(async ({ data, context }): Promise<BulkJob> => {
    const { data: owned } = await context.supabase
      .from("bulk_jobs")
      .select("id,status")
      .eq("id", data.jobId)
      .eq("user_id", context.userId)
      .single();
    if (!owned) throw new Error("Bulk job not found.");
    if (["paused", "cancelled", "completed"].includes(owned.status)) {
      return readOwnedJob(context.supabase, context.userId, data.jobId);
    }

    const { lookupGooglePlace, FriendlyError } = await import("./google.server");
    const { analyzeReview } = await import("./analysis.server");
    const { persistCase } = await import("./cases.functions");

    for (let index = 0; index < BULK_PASS_SIZE; index += 1) {
      const { data: claimed, error: claimError } = await context.supabase
        .rpc("claim_bulk_job_item", { _job_id: data.jobId, _lease_seconds: 600 });
      if (claimError) throw claimError;
      const item = claimed?.[0];
      if (!item) break;

      try {
        const lookup = await lookupGooglePlace(item.source_url);
        const matches = lookup.reviews.filter((review) => review.identityStatus === "exact_url_match");
        await context.supabase.from("bulk_job_items").update({
          status: "identified",
          business_name: lookup.business.name,
          detail: matches.length === 1 ? "Exact review identity verified" : "Business found; exact review needs confirmation",
        }).eq("id", item.id).eq("lease_token", item.lease_token);
        await context.supabase.rpc("refresh_bulk_job_counts", { _job_id: data.jobId });

        const review = matches.length === 1 ? matches[0] : undefined;
        if (!review) {
          await context.supabase.from("bulk_job_items").update({
            status: "needs_review",
            lease_token: null,
            lease_expires_at: null,
            completed_at: new Date().toISOString(),
            detail: "Google did not return one exact review match. No review was guessed or analyzed.",
          }).eq("id", item.id);
          await context.supabase.rpc("refresh_bulk_job_counts", { _job_id: data.jobId });
          continue;
        }

        await context.supabase.from("bulk_job_items").update({ status: "analyzing", detail: "Checking the verified review against Google policy" }).eq("id", item.id);
        await context.supabase.rpc("refresh_bulk_job_counts", { _job_id: data.jobId });
        const analysis = await analyzeReview(lookup.business, review);
        const saved = await persistCase(context.supabase as never, context.userId, {
          platform: "google",
          sourceUrl: item.source_url,
          business: lookup.business,
          review,
          analysis,
        });
        const reportReady = analysis.verdict === "strong_candidate" && analysis.confidence >= 70;
        await context.supabase.from("bulk_job_items").update({
          status: reportReady ? "report_ready" : "needs_review",
          case_id: saved.id,
          lease_token: null,
          lease_expires_at: null,
          completed_at: new Date().toISOString(),
          detail: reportReady ? "Verified evidence and report draft are ready" : "Analysis saved for human review",
        }).eq("id", item.id);
      } catch (error) {
        const detail = error instanceof FriendlyError ? `${error.message} ${error.hint}`.trim() : "This item could not be processed.";
        await context.supabase.from("bulk_job_items").update({
          status: "failed",
          lease_token: null,
          lease_expires_at: null,
          completed_at: new Date().toISOString(),
          detail,
          error_code: error instanceof FriendlyError ? "provider_error" : "processing_error",
        }).eq("id", item.id);
      }
      await context.supabase.rpc("refresh_bulk_job_counts", { _job_id: data.jobId });
    }
    return readOwnedJob(context.supabase, context.userId, data.jobId);
  });