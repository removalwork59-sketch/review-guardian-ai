import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { detectPlatform, PLATFORMS } from "./platforms";
import type { CaseRecord } from "./case-types";

export type BulkOutcome =
  | { ok: true; case: CaseRecord; businessName: string; reviewsSeen: number }
  | { ok: false; message: string; hint: string };

/**
 * One pasted link, end to end: find the business, pick the review most likely
 * to be a problem (lowest rating, longest text as the tie-break), run the AI
 * policy check and save it as a case.
 */
export const scanAndSaveUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ url: z.string().min(4) }).parse(input))
  .handler(async ({ data, context }): Promise<BulkOutcome> => {
    const platform = detectPlatform(data.url);
    const info = PLATFORMS[platform];
    if (!info.supported) {
      return { ok: false, message: info.note, hint: "Only Google links work right now." };
    }

    const { FriendlyError, lookupGooglePlace } = await import("./google.server");
    const { analyzeReview } = await import("./analysis.server");
    const { persistCase } = await import("./cases.functions");

    try {
      const lookup = await lookupGooglePlace(data.url);
      if (lookup.reviews.length === 0) {
        return {
          ok: false,
          message: "Google isn't sharing any review text for this business.",
          hint: "Nothing to check on this one.",
        };
      }

      const review = [...lookup.reviews].sort(
        (a, b) => a.rating - b.rating || b.text.length - a.text.length,
      )[0]!;

      const analysis = await analyzeReview(lookup.business, review);
      const saved = await persistCase(context.supabase as never, context.userId, {
        platform,
        sourceUrl: data.url.trim(),
        business: lookup.business,
        review,
        analysis,
      });

      return {
        ok: true,
        case: saved,
        businessName: lookup.business.name,
        reviewsSeen: lookup.reviews.length,
      };
    } catch (error) {
      if (error instanceof FriendlyError) {
        return { ok: false, message: error.message, hint: error.hint };
      }
      console.error(error);
      return {
        ok: false,
        message: "Something went wrong on this link.",
        hint: "Try it again on its own.",
      };
    }
  });
