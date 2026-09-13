const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export type NormalizedReview = {
  id: string;
  authorName: string;
  authorPhoto: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
  reviewUrl: string;
  identityStatus: "provider_observed" | "exact_url_match" | "unverified";
  identityMethod: "provider_resource_name" | "exact_provider_url" | "content_fingerprint";
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

export class FriendlyError extends Error {
  hint: string;
  constructor(message: string, hint = "") {
    super(message);
    this.hint = hint;
  }
}

function credentials() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !connectionKey) {
    throw new FriendlyError(
      "The Google connection isn't ready yet.",
      "Reconnect Google in the project's connections and try again.",
    );
  }
  return { lovableKey, connectionKey };
}

async function gateway(path: string, init: RequestInit & { fieldMask?: string } = {}) {
  const { lovableKey, connectionKey } = credentials();
  const { fieldMask, ...rest } = init;
  const response = await fetch(`${GATEWAY_URL}${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
      "Content-Type": "application/json",
      ...(fieldMask ? { "X-Goog-FieldMask": fieldMask } : {}),
      ...(rest.headers ?? {}),
    },
  });

  if (!response.ok) {
    const body = await response.text();
    console.error(`Google gateway request failed [${response.status}] ${path}: ${body}`);
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
    throw new FriendlyError(
      "We couldn't reach Google for this review right now.",
      "Please try again in a moment.",
    );
  }

  return (await response.json()) as Record<string, unknown>;
}

const GOOGLE_SHORT_LINK_HOSTS = new Set(["goo.gl", "maps.app.goo.gl", "g.page", "share.google"]);

/** Short links hide their Google destination; follow redirects without downloading the Maps page. */
async function expandUrl(rawUrl: string) {
  let current: URL;
  try {
    current = new URL(rawUrl);
  } catch {
    return rawUrl;
  }

  if (!GOOGLE_SHORT_LINK_HOSTS.has(current.hostname.toLowerCase())) return rawUrl;

  try {
    for (let redirectCount = 0; redirectCount < 5; redirectCount += 1) {
      const response = await fetch(current, { method: "GET", redirect: "manual" });
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || response.status < 300 || response.status >= 400) return current.toString();
      current = new URL(location, current);
    }
    return current.toString();
  } catch {
    return rawUrl;
  }
}

function parseGoogleUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new FriendlyError("That doesn't look like a web link.", "Paste the full link, starting with https://");
  }

  const placeId = url.searchParams.get("place_id") ?? undefined;
  const query = url.searchParams.get("q") ?? undefined;

  if (/^\/maps\/reviews(?:\/|$)/.test(url.pathname)) {
    throw new FriendlyError(
      "This is a link to one specific Google review, but Google doesn't expose its business through the official lookup API.",
      "Open the business's main Google Maps page and copy its link. We'll show Google's available reviews without guessing the identity of this one.",
    );
  }

  let placeName: string | undefined;
  const placeMatch = url.pathname.match(/\/maps\/place\/([^/]+)/);
  if (placeMatch?.[1]) {
    placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, " "));
  }

  let bias: { latitude: number; longitude: number } | undefined;
  const at = rawUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (at) bias = { latitude: Number(at[1]), longitude: Number(at[2]) };

  const searchText = placeName ?? query;
  if (!placeId && !searchText) {
    throw new FriendlyError(
      "We couldn't tell which business this link points to.",
      "Open the business on Google Maps and copy the link from the address bar.",
    );
  }

  return { placeId, searchText, bias };
}

function canonicalUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) =>
      url.searchParams.delete(key),
    );
    return url.toString().replace(/\/$/, "");
  } catch {
    return rawUrl.trim();
  }
}

function deterministicReviewId(review: {
  authorAttribution?: { displayName?: string };
  rating?: number;
  publishTime?: string;
  text?: { text?: string };
  originalText?: { text?: string };
}) {
  const value = [
    review.authorAttribution?.displayName ?? "",
    review.rating ?? 0,
    review.publishTime ?? "",
    review.text?.text ?? review.originalText?.text ?? "",
  ].join("\u001f");
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `observed-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

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

export async function lookupGooglePlace(rawUrl: string): Promise<PlaceLookup> {
  const expanded = await expandUrl(rawUrl.trim());
  const parsed = parseGoogleUrl(expanded);

  let placeId = parsed.placeId;

  if (!placeId && parsed.searchText) {
    const search = (await gateway("/places/v1/places:searchText", {
      method: "POST",
      fieldMask: "places.id,places.displayName",
      body: JSON.stringify({
        textQuery: parsed.searchText,
        pageSize: 1,
        ...(parsed.bias
          ? { locationBias: { circle: { center: parsed.bias, radius: 2000 } } }
          : {}),
      }),
    })) as { places?: Array<{ id?: string }> };
    placeId = search.places?.[0]?.id;
  }

  if (!placeId) {
    throw new FriendlyError(
      "We couldn't find this business on Google.",
      "Try the link from the business's main Google Maps page.",
    );
  }

  const details = (await gateway(`/places/v1/places/${encodeURIComponent(placeId)}`, {
    method: "GET",
    fieldMask: DETAILS_MASK,
  })) as {
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    rating?: number;
    userRatingCount?: number;
    googleMapsUri?: string;
    primaryTypeDisplayName?: { text?: string };
    reviews?: Array<{
      name?: string;
      rating?: number;
      text?: { text?: string };
      originalText?: { text?: string };
      relativePublishTimeDescription?: string;
      publishTime?: string;
      googleMapsUri?: string;
      authorAttribution?: { displayName?: string; photoUri?: string };
    }>;
  };

  const requestedUrl = canonicalUrl(expanded);
  const reviews: NormalizedReview[] = (details.reviews ?? []).map((review) => {
    const reviewUrl = review.googleMapsUri ?? "";
    const exactUrlMatch = Boolean(reviewUrl) && canonicalUrl(reviewUrl) === requestedUrl;
    const hasProviderId = Boolean(review.name);
    return {
      id: review.name ?? deterministicReviewId(review),
      authorName: review.authorAttribution?.displayName ?? "Google user",
      authorPhoto: review.authorAttribution?.photoUri ?? "",
      rating: review.rating ?? 0,
      text: review.text?.text ?? review.originalText?.text ?? "",
      relativeTime: review.relativePublishTimeDescription ?? "",
      publishTime: review.publishTime ?? "",
      reviewUrl: reviewUrl || details.googleMapsUri || expanded,
      identityStatus: exactUrlMatch ? "exact_url_match" : hasProviderId ? "provider_observed" : "unverified",
      identityMethod: exactUrlMatch
        ? "exact_provider_url"
        : hasProviderId
          ? "provider_resource_name"
          : "content_fingerprint",
      identityConfidence: exactUrlMatch ? 100 : hasProviderId ? 80 : 35,
    };
  });

  return {
    business: {
      placeId,
      name: details.displayName?.text ?? "This business",
      address: details.formattedAddress ?? "",
      rating: details.rating ?? null,
      ratingCount: details.userRatingCount ?? null,
      mapsUri: details.googleMapsUri ?? expanded,
      category: details.primaryTypeDisplayName?.text ?? "",
    },
    reviews,
    limitation:
      reviews.length === 0
        ? "Google isn't sharing any review text for this business right now, so there's nothing we can check."
        : "Google only shares a handful of reviews for each business, so this may not include every review on the page.",
  };
}
