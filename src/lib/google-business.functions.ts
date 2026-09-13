import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type GoogleBusinessConnection = {
  configured: boolean;
  connected: boolean;
  email: string | null;
  status: string | null;
  lastSyncedAt: string | null;
  lastError: string | null;
};

export const getGoogleBusinessConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GoogleBusinessConnection> => {
    const { data, error } = await context.supabase
      .from("google_business_connections")
      .select("google_account_email,status,last_synced_at,last_error")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return {
      configured: Boolean(process.env["GOOGLE_BUSINESS_CLIENT_ID"] && process.env["GOOGLE_BUSINESS_CLIENT_SECRET"]),
      connected: data?.status === "connected",
      email: data?.google_account_email ?? null,
      status: data?.status ?? null,
      lastSyncedAt: data?.last_synced_at ?? null,
      lastError: data?.last_error ?? null,
    };
  });

export const startGoogleBusinessConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ origin: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    const { assertAllowedOrigin, createGoogleAuthorization, encryptSecret, hashValue } = await import("./google-business.server");
    const origin = assertAllowedOrigin(data.origin);
    const redirectUri = `${origin}/api/public/google-business/callback`;
    const authorization = createGoogleAuthorization(redirectUri);
    const { error } = await context.supabase.from("google_oauth_states").insert({
      user_id: context.userId,
      state_hash: hashValue(authorization.state),
      code_verifier_ciphertext: await encryptSecret(authorization.verifier),
      redirect_origin: origin,
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (error) throw error;
    return { authorizationUrl: authorization.url };
  });

export type GoogleBusinessSyncResult = {
  locations: number;
  reviewsStored: number;
  reviewsAnalyzed: number;
  message: string;
};

const MAX_REVIEWS_PER_LOCATION = 50;
const MAX_ANALYSES_PER_SYNC = 5;

export const syncGoogleBusinessReviews = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GoogleBusinessSyncResult> => {
    const { data: connection, error: connectionError } = await context.supabase
      .from("google_business_connections")
      .select("access_token_ciphertext,refresh_token_ciphertext,token_expires_at,status")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (connectionError) throw connectionError;
    if (!connection || connection.status !== "connected") {
      throw new Error("Connect your Google Business Profile first, then sync.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { fetchOwnerReviews, getUsableAccessToken } = await import("./google-business-sync.server");
    const { persistCase } = await import("./cases.functions");
    const { analyzeReview } = await import("./analysis.server");

    let accessToken: string;
    try {
      accessToken = await getUsableAccessToken(supabaseAdmin as never, context.userId, connection);
    } catch (error) {
      await supabaseAdmin
        .from("google_business_connections")
        .update({ status: "needs_reconnect", last_error: (error as Error).message })
        .eq("user_id", context.userId);
      throw error;
    }

    const owned = await fetchOwnerReviews(accessToken, MAX_REVIEWS_PER_LOCATION);
    let reviewsStored = 0;
    let reviewsAnalyzed = 0;

    for (const entry of owned) {
      const business = {
        placeId: entry.location.placeId,
        name: entry.location.name,
        address: entry.location.address,
        rating: entry.location.rating,
        ratingCount: entry.location.ratingCount,
        mapsUri: entry.location.mapsUri,
        category: entry.location.category,
      };
      const { data: locationRow, error: locationError } = await context.supabase
        .from("locations")
        .upsert(
          {
            user_id: context.userId,
            platform: "google",
            place_id: business.placeId,
            name: business.name,
            address: business.address,
            category: business.category,
            maps_uri: business.mapsUri,
            rating: business.rating,
            rating_count: business.ratingCount,
          },
          { onConflict: "user_id,place_id" },
        )
        .select("id")
        .single();
      if (locationError) throw locationError;

      for (const review of entry.reviews) {
        const normalized = {
          ...review,
          identityStatus: "provider_observed" as const,
          identityMethod: "provider_resource_name" as const,
          identityConfidence: 95,
        };
        const { data: existingCase } = await context.supabase
          .from("review_cases")
          .select("id")
          .eq("user_id", context.userId)
          .eq("review_external_id", review.id)
          .maybeSingle();

        if (!existingCase && review.text.trim() && reviewsAnalyzed < MAX_ANALYSES_PER_SYNC) {
          const analysis = await analyzeReview(business, normalized);
          await persistCase(context.supabase as never, context.userId, {
            platform: "google",
            sourceUrl: review.reviewUrl || entry.location.mapsUri,
            business,
            review: normalized,
            analysis,
          });
          reviewsAnalyzed += 1;
          reviewsStored += 1;
          continue;
        }

        const { error: recordError } = await context.supabase.from("review_records").upsert(
          {
            user_id: context.userId,
            location_id: locationRow.id,
            platform: "google",
            external_id: review.id,
            canonical_source_url: review.reviewUrl || entry.location.mapsUri,
            review_url: review.reviewUrl || entry.location.mapsUri,
            author_name: review.authorName,
            author_photo_url: review.authorPhoto,
            rating: review.rating,
            review_text: review.text,
            relative_time: review.relativeTime,
            published_at: review.publishTime || null,
            content_fingerprint: review.id,
            raw_source: normalized,
            identity_status: "provider_observed",
            identity_method: "provider_resource_name",
            identity_confidence: 95,
            requested_source_url: entry.location.mapsUri,
            verified_at: new Date().toISOString(),
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: "user_id,platform,external_id" },
        );
        if (recordError) throw recordError;
        reviewsStored += 1;
      }
    }

    await supabaseAdmin
      .from("google_business_connections")
      .update({ last_synced_at: new Date().toISOString(), last_error: null })
      .eq("user_id", context.userId);

    return {
      locations: owned.length,
      reviewsStored,
      reviewsAnalyzed,
      message:
        reviewsAnalyzed >= MAX_ANALYSES_PER_SYNC
          ? "Synced. More reviews are waiting — run sync again to check the next batch."
          : "Synced your owner-authorized reviews.",
    };
  });

export const disconnectGoogleBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("google_business_connections")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw error;
    return { disconnected: true };
  });