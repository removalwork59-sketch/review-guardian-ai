import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { CASE_STATUSES } from "./case-types";
import type { CaseRecord, CaseStatus, LocationRecord } from "./case-types";
import type { ReviewAnalysis } from "./analysis-types";

const businessSchema = z.object({
  placeId: z.string(),
  name: z.string(),
  address: z.string(),
  rating: z.number().nullable(),
  ratingCount: z.number().nullable(),
  mapsUri: z.string(),
  category: z.string(),
});

const reviewSchema = z.object({
  id: z.string(),
  authorName: z.string(),
  authorPhoto: z.string(),
  rating: z.number(),
  text: z.string(),
  relativeTime: z.string(),
  publishTime: z.string(),
  reviewUrl: z.string(),
  identityStatus: z.enum(["provider_observed", "exact_url_match", "unverified"]),
  identityMethod: z.enum(["provider_resource_name", "exact_provider_url", "content_fingerprint"]),
  identityConfidence: z.number().int().min(0).max(100),
});

type Db = { from: (table: string) => any };

function canonicalizeSourceUrl(raw: string) {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }
    return url.toString();
  } catch {
    return raw.trim();
  }
}

async function fingerprintReview(platform: string, placeId: string, review: z.infer<typeof reviewSchema>) {
  const stable = [platform, placeId, review.authorName.trim().toLowerCase(), review.rating, review.publishTime, review.text.trim()].join("\u001f");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(stable));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toCase(row: any): CaseRecord {
  const location = row.locations ?? {};
  return {
    id: row.id,
    locationId: row.location_id,
    locationName: location.name ?? "Unknown business",
    locationAddress: location.address ?? "",
    platform: row.platform,
    sourceUrl: row.source_url,
    reviewUrl: row.review_url,
    authorName: row.author_name,
    reviewRating: row.review_rating === null ? null : Number(row.review_rating),
    reviewText: row.review_text,
    reviewRelativeTime: row.review_relative_time,
    verdict: row.verdict,
    violationCategory: row.violation_category,
    headline: row.headline,
    plainSummary: row.plain_summary,
    confidence: row.confidence,
    severity: row.severity,
    rejectionRisk: row.rejection_risk,
    status: row.status as CaseStatus,
    statusNote: row.status_note ?? "",
    reportedAt: row.reported_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    analysis: (row.analysis ?? null) as ReviewAnalysis | null,
  };
}

const CASE_SELECT = "*, locations ( name, address )";

export async function persistCase(
  supabase: Db,
  userId: string,
  input: {
    platform: string;
    sourceUrl: string;
    business: z.infer<typeof businessSchema>;
    review: z.infer<typeof reviewSchema>;
    analysis: ReviewAnalysis;
  },
) {
  const { data: location, error: locationError } = await supabase
    .from("locations")
    .upsert(
      {
        user_id: userId,
        platform: input.platform,
        place_id: input.business.placeId,
        name: input.business.name,
        address: input.business.address,
        category: input.business.category,
        maps_uri: input.business.mapsUri,
        rating: input.business.rating,
        rating_count: input.business.ratingCount,
      },
      { onConflict: "user_id,place_id" },
    )
    .select("id")
    .single();

  if (locationError) throw locationError;

  const canonicalSourceUrl = canonicalizeSourceUrl(input.sourceUrl);
  const contentFingerprint = await fingerprintReview(input.platform, input.business.placeId, input.review);
  const { data: reviewRecord, error: reviewError } = await supabase
    .from("review_records")
    .upsert(
      {
        user_id: userId,
        location_id: location.id,
        platform: input.platform,
        external_id: input.review.id,
        canonical_source_url: canonicalSourceUrl,
        review_url: input.review.reviewUrl,
        author_name: input.review.authorName,
        author_photo_url: input.review.authorPhoto,
        rating: input.review.rating,
        review_text: input.review.text,
        relative_time: input.review.relativeTime,
        published_at: input.review.publishTime || null,
        content_fingerprint: contentFingerprint,
        raw_source: input.review,
        identity_status: input.review.identityStatus,
        identity_method: input.review.identityMethod,
        identity_confidence: input.review.identityConfidence,
        requested_source_url: input.sourceUrl,
        verified_at: input.review.identityStatus === "exact_url_match" ? new Date().toISOString() : null,
        last_seen_at: new Date().toISOString(),
        observed_absent_at: null,
      },
      { onConflict: "user_id,platform,external_id" },
    )
    .select("id")
    .single();
  if (reviewError) throw reviewError;

  const payload = {
    user_id: userId,
    location_id: location.id,
    platform: input.platform,
    source_url: input.sourceUrl,
    review_external_id: input.review.id,
    review_url: input.review.reviewUrl,
    author_name: input.review.authorName,
    review_rating: input.review.rating,
    review_text: input.review.text,
    review_relative_time: input.review.relativeTime,
    verdict: input.analysis.verdict,
    violation_category: input.analysis.violationCategory,
    headline: input.analysis.headline,
    plain_summary: input.analysis.plainSummary,
    confidence: input.analysis.confidence,
    severity: input.analysis.severity,
    rejection_risk: input.analysis.rejectionRisk,
    analysis: input.analysis,
    review_record_id: reviewRecord.id,
    canonical_source_url: canonicalSourceUrl,
    analysis_version: 2,
  };

  const { data, error } = await supabase
    .from("review_cases")
    .upsert(payload, { onConflict: "user_id,review_external_id" })
    .select(CASE_SELECT)
    .single();
  if (error) throw error;

  const reportable = ["strong_candidate", "possible_candidate"].includes(input.analysis.verdict);
  if (reportable) {
    const reportBody = [
      input.analysis.policyReasoning,
      ...input.analysis.evidence.map((item) => `Evidence: ${item}`),
      input.analysis.recommendedAction,
    ].filter(Boolean).join("\n\n");
    const { error: reportError } = await supabase.from("report_drafts").upsert(
      {
        user_id: userId,
        case_id: data.id,
        version: 1,
        report_reason: input.analysis.recommendedReportReason,
        report_body: reportBody,
        evidence: input.analysis.evidence,
        counter_evidence: input.analysis.counterEvidence,
        status:
          input.analysis.verdict === "strong_candidate" &&
          input.analysis.confidence >= 70 &&
          input.review.identityStatus !== "unverified"
            ? "ready"
            : "draft",
      },
      { onConflict: "case_id,version" },
    );
    if (reportError) throw reportError;
  }
  return toCase(data);
}

export const saveCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        platform: z.string().default("google"),
        sourceUrl: z.string().default(""),
        business: businessSchema,
        review: reviewSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ case: CaseRecord; analysis: ReviewAnalysis }> => {
    const { analyzeReview } = await import("./analysis.server");
    const startedAt = Date.now();
    const analysis = await analyzeReview(data.business, data.review);
    const saved = await persistCase(context.supabase as unknown as Db, context.userId, {
      platform: data.platform,
      sourceUrl: data.sourceUrl,
      business: data.business,
      review: data.review,
      analysis,
    });
    const inputHash = await fingerprintReview(data.platform, data.business.placeId, data.review);
    const { data: persistedReview } = await context.supabase
      .from("review_records")
      .select("id")
      .eq("user_id", context.userId)
      .eq("platform", data.platform)
      .eq("external_id", data.review.id)
      .maybeSingle();
    const { error: auditError } = await context.supabase.from("ai_runs").insert({
      user_id: context.userId,
      review_record_id: persistedReview?.id ?? null,
      case_id: saved.id,
      purpose: "review_policy_analysis",
      model: "openai/gpt-6-astra",
      prompt_version: "review-policy-adversarial-v2",
      policy_version: "google-content-policy-2026-09",
      input_hash: inputHash,
      output: analysis,
      confidence: analysis.confidence,
      duration_ms: Date.now() - startedAt,
      status: "completed",
    });
    if (auditError) throw auditError;
    return { case: saved, analysis };
  });

export const listCases = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CaseRecord[]> => {
    const { data, error } = await context.supabase
      .from("review_cases")
      .select(CASE_SELECT)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return (data ?? []).map(toCase);
  });

export const listLocations = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LocationRecord[]> => {
    const { data: locations, error } = await context.supabase
      .from("locations")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;

    const { data: cases, error: caseError } = await context.supabase
      .from("review_cases")
      .select("location_id, status, created_at");
    if (caseError) throw caseError;

    return (locations ?? []).map((location: any): LocationRecord => {
      const related = (cases ?? []).filter((item: any) => item.location_id === location.id);
      const last = related
        .map((item: any) => item.created_at as string)
        .sort()
        .at(-1);
      return {
        id: location.id,
        name: location.name,
        address: location.address,
        category: location.category,
        mapsUri: location.maps_uri,
        rating: location.rating === null ? null : Number(location.rating),
        ratingCount: location.rating_count,
        caseCount: related.length,
        reportedCount: related.filter((item: any) =>
          ["reported", "pending", "removed", "rejected"].includes(item.status),
        ).length,
        removedCount: related.filter((item: any) => item.status === "removed").length,
        lastScanAt: last ?? null,
      };
    });
  });

export const updateCaseStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(CASE_STATUSES),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CaseRecord> => {
    const { data: current, error: currentError } = await context.supabase
      .from("review_cases")
      .select("status")
      .eq("id", data.id)
      .single();
    if (currentError) throw currentError;

    const transitions: Record<CaseStatus, readonly CaseStatus[]> = {
      new: ["reported", "ignored"],
      reported: ["pending", "removed", "rejected"],
      pending: ["removed", "rejected"],
      removed: [],
      rejected: [],
      ignored: ["new"],
    };
    const currentStatus = current.status as CaseStatus;
    if (data.status !== currentStatus && !transitions[currentStatus].includes(data.status)) {
      throw new Error(`Invalid case status transition: ${currentStatus} to ${data.status}`);
    }
    const now = new Date().toISOString();
    const patch = {
      status: data.status,
      ...(data.note !== undefined ? { status_note: data.note } : {}),
      ...(["reported", "pending"].includes(data.status) ? { reported_at: now } : {}),
      ...(["removed", "rejected"].includes(data.status) ? { resolved_at: now } : {}),
      ...(data.status === "new" ? { reported_at: null, resolved_at: null } : {}),
    };

    const { data: row, error } = await context.supabase
      .from("review_cases")
      .update(patch)
      .eq("id", data.id)
      .select(CASE_SELECT)
      .single();
    if (error) throw error;
    return toCase(row);
  });

export const deleteCase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("review_cases").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });
