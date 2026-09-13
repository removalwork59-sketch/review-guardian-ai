/**
 * Resolves a pasted Google link to a business and its real reviews, trying each legitimate
 * source in order and never guessing which review the link means:
 *   1. the link itself (place id, CID, review id)
 *   2. the signed-in owner's Google Business Profile (official API, exact review id match)
 *   3. Google Places public data
 * Whatever a source can't provide is reported in plain words instead of being papered over.
 */
import {
  FriendlyError,
  expandGoogleUrl,
  lookupGooglePlace,
  parseGoogleReference,
} from "./google.server";
import type { NormalizedBusiness, NormalizedReview, PlaceLookup } from "./google.server";
import type { BusinessProfileReview, OwnedLocation } from "./google-business-api.server";

export type ReviewSource = "google_business_profile" | "google_places";

export type ResolvedReviews = PlaceLookup & {
  source: ReviewSource;
  /** True when a review matching the pasted link's review id was verified by Google. */
  exactReviewFound: boolean;
};

function relativeTime(iso: string) {
  const time = new Date(iso).getTime();
  if (!Number.isFinite(time)) return "";
  const days = Math.floor((Date.now() - time) / 86_400_000);
  if (days < 1) return "today";
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
}

function fromBusinessProfile(
  review: BusinessProfileReview,
  exact: boolean,
  reviewUrl: string,
): NormalizedReview {
  return {
    id: review.name,
    authorName: review.reviewerName,
    authorPhoto: review.reviewerPhoto,
    rating: review.rating,
    text: review.comment,
    relativeTime: relativeTime(review.createTime),
    publishTime: review.createTime,
    reviewUrl,
    identityStatus: exact ? "official_sync_verified" : "provider_observed",
    identityMethod: exact ? "official_review_id" : "provider_resource_name",
    identityConfidence: exact ? 100 : 90,
  };
}

async function fromOwnedProfile(
  workspaceId: string,
  pastedUrl: string,
  reference: ReturnType<typeof parseGoogleReference>,
  places: PlaceLookup | null,
): Promise<{ result: ResolvedReviews | null; note: string | null }> {
  const {
    describeBusinessProfileError,
    getBusinessProfileAccessToken,
    getOwnedReview,
    listOwnedLocations,
    listOwnedReviews,
  } = await import("./google-business-api.server");

  try {
    const accessToken = await getBusinessProfileAccessToken(workspaceId);
    if (!accessToken) {
      return {
        result: null,
        note: "Connect the business's Google account on the Locations page to read its full, verified reviews.",
      };
    }

    const locations = await listOwnedLocations(workspaceId, accessToken);
    const placeId = places?.business.placeId ?? reference.placeId ?? null;
    const location: OwnedLocation | undefined = locations.find(
      (candidate) =>
        (placeId && candidate.placeId === placeId) ||
        (reference.cid && candidate.cid === reference.cid),
    );
    if (!location) {
      return {
        result: null,
        note: "The connected Google account doesn't manage this business, so only Google's public data is available for it.",
      };
    }

    const business: NormalizedBusiness = places?.business ?? {
      placeId: location.placeId ?? location.name,
      name: location.title,
      address: location.address,
      rating: null,
      ratingCount: null,
      mapsUri: location.mapsUri ?? reference.expandedUrl,
      category: location.category,
    };
    const locationUrl = location.mapsUri ?? business.mapsUri;

    if (reference.reviewId) {
      const exact = await getOwnedReview(accessToken, location, reference.reviewId);
      if (exact) {
        return {
          result: {
            business,
            reviews: [fromBusinessProfile(exact, true, pastedUrl)],
            limitation: null,
            source: "google_business_profile",
            exactReviewFound: true,
          },
          note: null,
        };
      }
    }

    const listed = await listOwnedReviews(accessToken, location);
    const exactIndex = reference.reviewId
      ? listed.reviews.findIndex((review) => review.reviewId === reference.reviewId)
      : -1;
    const reviews =
      exactIndex >= 0
        ? [fromBusinessProfile(listed.reviews[exactIndex]!, true, pastedUrl)]
        : listed.reviews.map((review) => fromBusinessProfile(review, false, locationUrl));

    const limitations = [
      reference.reviewId && exactIndex < 0
        ? "Google didn't confirm which review this link points to, so pick the review you mean from the business's verified reviews."
        : null,
      !listed.complete
        ? "Showing the most recent reviews Google returned for this business."
        : null,
    ].filter(Boolean);

    return {
      result: {
        business: {
          ...business,
          rating: business.rating ?? listed.averageRating,
          ratingCount: business.ratingCount ?? listed.totalReviewCount,
        },
        reviews,
        limitation: limitations.length ? limitations.join(" ") : null,
        source: "google_business_profile",
        exactReviewFound: exactIndex >= 0,
      },
      note: null,
    };
  } catch (error) {
    return { result: null, note: describeBusinessProfileError(error) };
  }
}

export async function resolveGoogleReviews(
  rawUrl: string,
  workspaceId: string | null,
): Promise<ResolvedReviews> {
  const pastedUrl = rawUrl.trim();
  const reference = parseGoogleReference(await expandGoogleUrl(pastedUrl));

  let places: PlaceLookup | null = null;
  let placesError: FriendlyError | null = null;
  try {
    places = await lookupGooglePlace(pastedUrl, reference);
  } catch (error) {
    if (!(error instanceof FriendlyError)) throw error;
    placesError = error;
  }

  // An exact public match is already verified; otherwise the owner's official data is preferred.
  const placesExact = places?.reviews.filter(
    (review) => review.identityStatus === "exact_url_match",
  );
  if (places && placesExact && placesExact.length === 1) {
    return {
      ...places,
      reviews: placesExact,
      limitation: null,
      source: "google_places",
      exactReviewFound: true,
    };
  }

  const owned = workspaceId
    ? await fromOwnedProfile(workspaceId, pastedUrl, reference, places)
    : {
        result: null,
        note: "Sign in and connect the business's Google account to read its full, verified reviews.",
      };
  if (owned.result) return owned.result;

  if (places) {
    const withText = places.reviews.length > 0;
    return {
      ...places,
      limitation:
        [places.limitation, withText ? null : owned.note].filter(Boolean).join(" ") || null,
      source: "google_places",
      exactReviewFound: false,
    };
  }

  throw new FriendlyError(
    placesError?.message ?? "We couldn't find this business on Google.",
    owned.note ?? placesError?.hint ?? "",
  );
}
