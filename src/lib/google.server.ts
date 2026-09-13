const PLACES_API = "https://places.googleapis.com/v1";
const REQUEST_TIMEOUT_MS = 10_000;

export type ReviewIdentityStatus =
  "provider_observed" | "exact_url_match" | "official_sync_verified" | "unverified";

export type ReviewIdentityMethod =
  | "provider_resource_name"
  | "exact_provider_url"
  | "provider_review_id"
  | "official_review_id"
  | "content_fingerprint";

export type NormalizedReview = {
  id: string;
  authorName: string;
  authorPhoto: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
  reviewUrl: string;
  identityStatus: ReviewIdentityStatus;
  identityMethod: ReviewIdentityMethod;
  identityConfidence: number;
};

export type NormalizedBusiness = {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  ratingCount: number | null;
  mapsUri: string;
  category: string;
};

export type PlaceLookup = {
  business: NormalizedBusiness;
  reviews: NormalizedReview[];
  /** Honest note about what the platform actually returned. */
  limitation: string | null;
};

/** Everything a pasted Google link tells us about which business and review it points at. */
export type GoogleReference = {
  expandedUrl: string;
  placeId?: string | undefined;
  searchText?: string | undefined;
  bias?: { latitude: number; longitude: number } | undefined;
  /** Decimal Maps customer id (CID), derived from the "0x…:0x…" feature id. */
  cid?: string | undefined;
  /** Google Maps review id ("Ch…") carried by review share links. */
  reviewId?: string | undefined;
};

export class FriendlyError extends Error {
  hint: string;
  constructor(message: string, hint = "") {
    super(message);
    this.hint = hint;
  }
}

function apiKey() {
  const key = process.env["GOOGLE_API_KEY"] ?? process.env["GOOGLE_MAPS_API_KEY"];
  if (!key) {
    throw new FriendlyError(
      "The Google connection isn't ready yet.",
      "The server's Google Places key is not configured.",
    );
  }
  return key;
}

/** Small in-process TTL cache so repeat scans of the same link skip Google round-trips. */
export class TtlCache<T> {
  private entries = new Map<string, { value: T; expires: number }>();
  constructor(
    private ttlMs: number,
    private maxEntries: number,
  ) {}
  get(key: string) {
    const hit = this.entries.get(key);
    if (!hit) return undefined;
    if (hit.expires < Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    return hit.value;
  }
  set(key: string, value: T) {
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(key, { value, expires: Date.now() + this.ttlMs });
  }
}

const expandedByUrl = new TtlCache<string>(60 * 60_000, 2000);
const placeIdByUrl = new TtlCache<string>(60 * 60_000, 2000);
const detailsByPlaceId = new TtlCache<PlaceDetails>(5 * 60_000, 500);

async function places(path: string, init: RequestInit & { fieldMask: string }) {
  const { fieldMask, ...rest } = init;
  let response: Response;
  try {
    response = await fetch(`${PLACES_API}${path}`, {
      ...rest,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey(),
        "X-Goog-FieldMask": fieldMask,
        ...(rest.headers ?? {}),
      },
    });
  } catch (error) {
    console.error(`Google Places request failed before a response: ${path}`, error);
    throw new FriendlyError(
      "We couldn't reach Google for this review right now.",
      "Please try again in a moment.",
    );
  }

  if (!response.ok) {
    const body = await response.text();
    console.error(
      `Google Places request failed [${response.status}] ${path}: ${body.slice(0, 500)}`,
    );
    if (response.status === 403) {
      throw new FriendlyError(
        "Google turned down our request for this business.",
        "This is a Google access restriction, not a problem with your link.",
      );
    }
    if (response.status === 429) {
      throw new FriendlyError(
        "We've reached Google's lookup limit for now.",
        "Please try again in a few minutes.",
      );
    }
    if (response.status === 400 || response.status === 404) {
      throw new FriendlyError(
        "Google couldn't find this business from the link.",
        "Try the link from the business's main Google Maps page.",
      );
    }
    throw new FriendlyError(
      "We couldn't reach Google for this review right now.",
      "Please try again in a moment.",
    );
  }

  return (await response.json()) as Record<string, unknown>;
}

export function isGoogleHost(hostname: string) {
  const host = hostname.toLowerCase();
  return (
    /^(?:[a-z0-9-]+\.)?google\.[a-z.]+$/.test(host) ||
    host === "goo.gl" ||
    host.endsWith(".goo.gl") ||
    host === "g.page" ||
    host.endsWith(".g.page")
  );
}

/** Follows a URL's redirects, but only ever returns a Google URL. */
async function followGoogleRedirect(url: URL) {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    await res.body?.cancel().catch(() => undefined);
    const finalUrl = res.url ? new URL(res.url) : null;
    return finalUrl && isGoogleHost(finalUrl.hostname) ? finalUrl.toString() : null;
  } catch {
    return null;
  }
}

/** Short links hide the real place; follow them, but only to Google hosts. */
export async function expandGoogleUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  const candidate = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
  const cached = expandedByUrl.get(candidate);
  if (cached) return cached;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return candidate;
  }
  const expanded = /goo\.gl$|g\.page$/i.test(url.hostname)
    ? ((await followGoogleRedirect(url)) ?? candidate)
    : candidate;
  expandedByUrl.set(candidate, expanded);
  return expanded;
}

/** Google's hex CID form ("0x<hex>:0x<hex>") is not a Places place id. */
function isCidHex(value: string) {
  return /^0x[0-9a-f]+(?::0x[0-9a-f]+)?$/i.test(value.trim());
}

function cidFromFeatureId(featureId: string) {
  const second = featureId.split(":")[1];
  if (!second || !/^0x[0-9a-f]+$/i.test(second)) return undefined;
  try {
    return BigInt(second).toString();
  } catch {
    return undefined;
  }
}

/** Parses a (possibly already expanded) Google link without calling any API. */
export function parseGoogleReference(expandedUrl: string): GoogleReference {
  let url: URL;
  try {
    url = new URL(expandedUrl);
  } catch {
    throw new FriendlyError(
      "That doesn't look like a web link.",
      "Paste the full link, starting with https://",
    );
  }
  if (!isGoogleHost(url.hostname)) {
    throw new FriendlyError(
      "That isn't a Google link.",
      "Open the business or review on Google Maps and copy the link.",
    );
  }

  const decoded = decodeURIComponent(expandedUrl);
  const explicitId = url.searchParams.get("query_place_id") ?? url.searchParams.get("place_id");
  const placeId = explicitId && !isCidHex(explicitId) ? explicitId : undefined;
  const query = url.searchParams.get("q") ?? url.searchParams.get("query") ?? undefined;

  let placeName: string | undefined;
  const placeMatch = url.pathname.match(/\/maps\/place\/([^/]+)/);
  if (placeMatch?.[1]) {
    placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, " ")).trim();
  }

  let bias: GoogleReference["bias"];
  const at =
    decoded.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/) ?? decoded.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
  if (at) bias = { latitude: Number(at[1]), longitude: Number(at[2]) };

  const explicitCid = url.searchParams.get("cid");
  const featureId =
    decoded.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/i)?.[1] ?? url.searchParams.get("ftid");
  const cid =
    (explicitCid && /^\d+$/.test(explicitCid) ? explicitCid : undefined) ??
    (featureId ? cidFromFeatureId(featureId) : undefined);

  // Review share links carry the review id as a "!1sCh…" token (base64 of the review key).
  const reviewId = decoded.match(/!1s(Ch[A-Za-z0-9_-]{16,})/)?.[1];

  const searchText = placeName ?? (query && !/^https?:\/\//.test(query) ? query : undefined);
  if (!placeId && !searchText && !cid) {
    throw new FriendlyError(
      "We couldn't tell which business this link points to.",
      "Open the business or review on Google Maps and copy the link from the address bar.",
    );
  }

  return { expandedUrl, placeId, searchText, bias, cid, reviewId };
}

function canonicalUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return rawUrl.trim();
  }
}

function deterministicReviewId(review: PlaceReview) {
  const value = [
    review.authorAttribution?.displayName ?? "",
    review.rating ?? 0,
    review.publishTime ?? "",
    review.text?.text ?? review.originalText?.text ?? "",
  ].join("");
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `observed-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

type PlaceReview = {
  name?: string;
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  relativePublishTimeDescription?: string;
  publishTime?: string;
  googleMapsUri?: string;
  authorAttribution?: { displayName?: string; photoUri?: string };
};

type PlaceDetails = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  rating?: number;
  userRatingCount?: number;
  googleMapsUri?: string;
  primaryTypeDisplayName?: { text?: string };
  reviews?: PlaceReview[];
};

const DETAILS_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "googleMapsUri",
  "primaryTypeDisplayName",
  "reviews",
].join(",");

type PlaceCandidate = { id?: string; googleMapsUri?: string };

function cidOf(candidate: PlaceCandidate) {
  return candidate.googleMapsUri?.match(/[?&]cid=(\d+)/)?.[1];
}

/**
 * A review link carries no business name, only coordinates and the Maps CID. Google's own
 * nearby results include each place's Maps URL (which carries its CID), so a place is accepted
 * only when that CID is identical — an exact identity check, never a closest-match guess.
 */
async function placeIdFromCid(cid: string, bias: NonNullable<GoogleReference["bias"]>) {
  for (const radius of [150, 1000]) {
    const nearby = (await places("/places:searchNearby", {
      method: "POST",
      fieldMask: "places.id,places.googleMapsUri",
      body: JSON.stringify({
        maxResultCount: 20,
        rankPreference: "DISTANCE",
        locationRestriction: { circle: { center: bias, radius } },
      }),
    })) as { places?: PlaceCandidate[] };
    const match = nearby.places?.find((candidate) => cidOf(candidate) === cid);
    if (match?.id) return match.id;
  }
  return undefined;
}

async function resolvePlaceId(reference: GoogleReference) {
  const cacheKey = canonicalUrl(reference.expandedUrl);
  const cached = placeIdByUrl.get(cacheKey);
  if (cached) return cached;

  let placeId = reference.placeId;
  if (!placeId && reference.cid && reference.bias) {
    placeId = await placeIdFromCid(reference.cid, reference.bias);
  }
  if (!placeId && reference.searchText) {
    const search = (await places("/places:searchText", {
      method: "POST",
      fieldMask: "places.id,places.googleMapsUri",
      body: JSON.stringify({
        textQuery: reference.searchText,
        pageSize: reference.cid ? 5 : 1,
        ...(reference.bias
          ? { locationBias: { circle: { center: reference.bias, radius: 2000 } } }
          : {}),
      }),
    })) as { places?: PlaceCandidate[] };
    const results = search.places ?? [];
    const verified = reference.cid
      ? results.find((candidate) => cidOf(candidate) === reference.cid)
      : undefined;
    // A review link must never be tied to an unverified business; a business link may use
    // Google's top result for the name it names.
    placeId = verified?.id ?? (reference.reviewId ? undefined : results[0]?.id);
  }

  if (!placeId) {
    throw new FriendlyError(
      "We couldn't find this business on Google.",
      "Try the link from the business's main Google Maps page.",
    );
  }
  placeIdByUrl.set(cacheKey, placeId);
  return placeId;
}

async function placeDetails(placeId: string) {
  const cached = detailsByPlaceId.get(placeId);
  if (cached) return cached;
  const resourceId = placeId.startsWith("places/") ? placeId.slice("places/".length) : placeId;
  const details = (await places(`/places/${encodeURIComponent(resourceId)}`, {
    method: "GET",
    fieldMask: DETAILS_MASK,
  })) as PlaceDetails;
  detailsByPlaceId.set(placeId, details);
  return details;
}

export async function lookupGooglePlace(
  rawUrl: string,
  known?: GoogleReference,
): Promise<PlaceLookup> {
  const reference = known ?? parseGoogleReference(await expandGoogleUrl(rawUrl));
  const placeId = await resolvePlaceId(reference);
  const details = await placeDetails(placeId);

  const requestedUrl = canonicalUrl(reference.expandedUrl);
  const reviews: NormalizedReview[] = (details.reviews ?? []).map((review) => {
    const reviewUrl = review.googleMapsUri ?? "";
    const idMatch =
      Boolean(reference.reviewId) &&
      Boolean(review.name?.endsWith(`/reviews/${reference.reviewId}`));
    const urlMatch = Boolean(reviewUrl) && canonicalUrl(reviewUrl) === requestedUrl;
    const hasProviderId = Boolean(review.name);
    return {
      id: review.name ?? deterministicReviewId(review),
      authorName: review.authorAttribution?.displayName ?? "Google user",
      authorPhoto: review.authorAttribution?.photoUri ?? "",
      rating: review.rating ?? 0,
      text: review.text?.text ?? review.originalText?.text ?? "",
      relativeTime: review.relativePublishTimeDescription ?? "",
      publishTime: review.publishTime ?? "",
      reviewUrl: reviewUrl || details.googleMapsUri || reference.expandedUrl,
      identityStatus:
        idMatch || urlMatch
          ? "exact_url_match"
          : hasProviderId
            ? "provider_observed"
            : "unverified",
      identityMethod: idMatch
        ? "provider_review_id"
        : urlMatch
          ? "exact_provider_url"
          : hasProviderId
            ? "provider_resource_name"
            : "content_fingerprint",
      identityConfidence: idMatch || urlMatch ? 100 : hasProviderId ? 80 : 35,
    };
  });

  return {
    business: {
      placeId: details.id ?? placeId,
      name: details.displayName?.text ?? "This business",
      address: details.formattedAddress ?? "",
      rating: details.rating ?? null,
      ratingCount: details.userRatingCount ?? null,
      mapsUri: details.googleMapsUri ?? reference.expandedUrl,
      category: details.primaryTypeDisplayName?.text ?? "",
    },
    reviews,
    limitation:
      reviews.length === 0
        ? "Google's public Places data isn't sharing review text for this business, so there's nothing to check from that source."
        : "Google's public Places data only shares a handful of reviews for each business, so this may not include every review.",
  };
}
