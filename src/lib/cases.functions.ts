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
});

const analysisSchema = z.object({}).passthrough();

type Db = { from: (table: string) => any };

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
  };

  const { data: existing } = await supabase
    .from("review_cases")
    .select("id")
    .eq("user_id", userId)
    .eq("review_external_id", input.review.id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("review_cases")
      .update(payload)
      .eq("id", existing.id)
      .select(CASE_SELECT)
      .single();
    if (error) throw error;
    return toCase(data);
  }

  const { data, error } = await supabase
    .from("review_cases")
    .insert(payload)
    .select(CASE_SELECT)
    .single();
  if (error) throw error;
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
        analysis: analysisSchema,
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<CaseRecord> => {
    return persistCase(context.supabase as unknown as Db, context.userId, {
      platform: data.platform,
      sourceUrl: data.sourceUrl,
      business: data.business,
      review: data.review,
      analysis: data.analysis as unknown as ReviewAnalysis,
    });
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
    const now = new Date().toISOString();
    const patch: Record<string, unknown> = { status: data.status };
    if (data.note !== undefined) patch["status_note"] = data.note;
    if (["reported", "pending"].includes(data.status)) patch["reported_at"] = now;
    if (["removed", "rejected"].includes(data.status)) patch["resolved_at"] = now;
    if (data.status === "new") {
      patch["reported_at"] = null;
      patch["resolved_at"] = null;
    }

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
