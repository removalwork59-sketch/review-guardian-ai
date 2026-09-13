import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { detectPlatform, PLATFORMS } from "./platforms";
import { FriendlyError } from "./google.server";
import { analyzeReview } from "./analysis.server";
import type { ReviewAnalysis } from "./analysis.server";
import type { NormalizedBusiness, NormalizedReview } from "./google.server";
import type { ReviewSource } from "./review-resolver.server";

export type ScanResult = {
  platform: string;
  platformLabel: string;
  business: NormalizedBusiness;
  reviews: NormalizedReview[];
  limitation: string | null;
  sourceUrl: string;
  source: ReviewSource;
  exactReviewFound: boolean;
};

export type ScanFailure = { ok: false; message: string; hint: string };
export type ScanSuccess = { ok: true; result: ScanResult };

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
  identityStatus: z.enum([
    "provider_observed",
    "exact_url_match",
    "official_sync_verified",
    "unverified",
  ]),
  identityMethod: z.enum([
    "provider_resource_name",
    "exact_provider_url",
    "provider_review_id",
    "official_review_id",
    "content_fingerprint",
  ]),
  identityConfidence: z.number().int().min(0).max(100),
});

function toFailure(error: unknown): ScanFailure {
  if (error instanceof FriendlyError) {
    return { ok: false, message: error.message, hint: error.hint };
  }
  console.error(error);
  return {
    ok: false,
    message: "Something went wrong while checking this link.",
    hint: "Please try again in a moment.",
  };
}

export const scanReviewUrl = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ url: z.string().min(4) }).parse(input))
  .handler(async ({ data }): Promise<ScanSuccess | ScanFailure> => {
    const platform = detectPlatform(data.url);
    const info = PLATFORMS[platform];

    if (!info.supported) {
      return { ok: false, message: info.note, hint: "Paste a Google Maps review link instead." };
    }

    try {
      const { getOptionalUserId } = await import("./optional-auth.server");
      const { resolveGoogleReviews } = await import("./review-resolver.server");
      const resolved = await resolveGoogleReviews(data.url, await getOptionalUserId());
      return {
        ok: true,
        result: {
          platform,
          platformLabel: info.label,
          business: resolved.business,
          reviews: resolved.reviews,
          limitation: resolved.limitation,
          sourceUrl: data.url.trim(),
          source: resolved.source,
          exactReviewFound: resolved.exactReviewFound,
        },
      };
    } catch (error) {
      return toFailure(error);
    }
  });

export type AnalysisSuccess = { ok: true; analysis: ReviewAnalysis };

export const analyzeReviewForPolicy = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ business: businessSchema, review: reviewSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<AnalysisSuccess | ScanFailure> => {
    try {
      const analysis = await analyzeReview(data.business, data.review);
      return { ok: true, analysis };
    } catch (error) {
      return toFailure(error);
    }
  });
