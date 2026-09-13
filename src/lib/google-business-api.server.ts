/**
 * Google Business Profile API access for a user's own connected Google account (server only).
 * Reads accounts, locations and reviews the signed-in owner is authorized to manage.
 */
import { TtlCache } from "./google.server";

const ACCOUNTS_API = "https://mybusinessaccountmanagement.googleapis.com/v1";
const INFO_API = "https://mybusinessbusinessinformation.googleapis.com/v1";
const REVIEWS_API = "https://mybusiness.googleapis.com/v4";
const REQUEST_TIMEOUT_MS = 15_000;

export class BusinessProfileError extends Error {
  status: number;
  reason: string | null;
  quotaZero: boolean;
  constructor(message: string, status: number, reason: string | null, quotaZero: boolean) {
    super(message);
    this.status = status;
    this.reason = reason;
    this.quotaZero = quotaZero;
  }
}

/** Plain-language, exact explanation of a Business Profile API failure. */
export function describeBusinessProfileError(error: unknown) {
  if (!(error instanceof BusinessProfileError)) {
    return "Google Business Profile couldn't be reached right now.";
  }
  if (error.quotaZero) {
    return "Google hasn't approved this app's Business Profile API access yet: the Google Cloud project's request quota is 0 per minute, so owner reviews can't be read until Google approves the Basic API Access application.";
  }
  if (error.reason === "SERVICE_DISABLED") {
    return "A required Google Business Profile API is turned off in the app's Google Cloud project.";
  }
  if (error.status === 401) {
    return "The Google connection has expired. Reconnect Google on the Locations page.";
  }
  if (error.status === 403) {
    return "Google denied access: the connected Google account doesn't manage this Business Profile.";
  }
  if (error.status === 429) {
    return "Google's Business Profile rate limit was reached. Please try again in a minute.";
  }
  return error.message;
}

// When Google reports a 0 quota, every call fails the same way; don't slow scans re-asking.
let quotaZeroUntil = 0;
let quotaZeroError: BusinessProfileError | null = null;

async function googleGet<T>(url: string, accessToken: string): Promise<T> {
  if (quotaZeroError && Date.now() < quotaZeroUntil) throw quotaZeroError;
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch {
    throw new BusinessProfileError("Google Business Profile could not be reached.", 0, null, false);
  }
  if (response.ok) return (await response.json()) as T;

  const body = (await response.json().catch(() => ({}))) as {
    error?: {
      message?: string;
      status?: string;
      details?: Array<{ reason?: string; metadata?: Record<string, string> }>;
    };
  };
  const details = body.error?.details ?? [];
  const reason = details.find((detail) => detail.reason)?.reason ?? body.error?.status ?? null;
  const quotaZero =
    response.status === 429 &&
    details.some((detail) => detail.metadata?.["quota_limit_value"] === "0");
  const error = new BusinessProfileError(
    `Google Business Profile API ${response.status}: ${body.error?.message ?? response.statusText}`,
    response.status,
    reason,
    quotaZero,
  );
  console.error(`[business-profile] ${error.message} reason=${reason ?? "none"}`);
  if (quotaZero) {
    quotaZeroError = error;
    quotaZeroUntil = Date.now() + 10 * 60_000;
  }
  throw error;
}

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

async function admin(): Promise<Admin> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Returns a valid access token for the user's own connection, refreshing it when needed. */
export async function getBusinessProfileAccessToken(userId: string): Promise<string | null> {
  const db = await admin();
  const { data: connection, error } = await db
    .from("google_business_connections")
    .select("access_token_ciphertext,refresh_token_ciphertext,token_expires_at,status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!connection || connection.status !== "connected") return null;

  const { decryptSecret, encryptSecret, refreshGoogleAccessToken } =
    await import("./google-business.server");
  if (new Date(connection.token_expires_at).getTime() - 60_000 > Date.now()) {
    return decryptSecret(connection.access_token_ciphertext);
  }

  try {
    const refreshed = await refreshGoogleAccessToken(
      await decryptSecret(connection.refresh_token_ciphertext),
    );
    await db
      .from("google_business_connections")
      .update({
        access_token_ciphertext: await encryptSecret(refreshed.accessToken),
        token_expires_at: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
        last_error: null,
      })
      .eq("user_id", userId);
    return refreshed.accessToken;
  } catch (refreshError) {
    const reauthorize = (refreshError as { reauthorize?: boolean }).reauthorize === true;
    await db
      .from("google_business_connections")
      .update({
        ...(reauthorize ? { status: "reauthorization_required" } : {}),
        last_error: refreshError instanceof Error ? refreshError.message : "Token refresh failed",
      })
      .eq("user_id", userId);
    throw new BusinessProfileError(
      "The Google connection has expired. Reconnect Google on the Locations page.",
      401,
      reauthorize ? "invalid_grant" : null,
      false,
    );
  }
}

export type OwnedLocation = {
  account: string;
  /** "locations/{id}" */
  name: string;
  title: string;
  address: string;
  category: string;
  placeId: string | null;
  cid: string | null;
  mapsUri: string | null;
};

type RawLocation = {
  name: string;
  title?: string;
  storefrontAddress?: { addressLines?: string[]; locality?: string; postalCode?: string };
  categories?: { primaryCategory?: { displayName?: string } };
  metadata?: { placeId?: string; mapsUri?: string };
};

const locationsByUser = new TtlCache<OwnedLocation[]>(10 * 60_000, 500);

/** Every Business Profile location the connected account manages (paginated). */
export async function listOwnedLocations(userId: string, accessToken: string) {
  const cached = locationsByUser.get(userId);
  if (cached) return cached;

  const accounts: Array<{ name: string }> = [];
  let pageToken: string | undefined;
  for (let page = 0; page < 5; page += 1) {
    const body = await googleGet<{ accounts?: Array<{ name: string }>; nextPageToken?: string }>(
      `${ACCOUNTS_API}/accounts?pageSize=20${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
      accessToken,
    );
    accounts.push(...(body.accounts ?? []));
    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }

  const readMask = "name,title,storefrontAddress,categories,metadata";
  const perAccount = await Promise.all(
    accounts.map(async (account) => {
      const out: OwnedLocation[] = [];
      let token: string | undefined;
      for (let page = 0; page < 10; page += 1) {
        const body = await googleGet<{ locations?: RawLocation[]; nextPageToken?: string }>(
          `${INFO_API}/${account.name}/locations?pageSize=100&readMask=${readMask}${token ? `&pageToken=${encodeURIComponent(token)}` : ""}`,
          accessToken,
        );
        for (const location of body.locations ?? []) {
          const mapsUri = location.metadata?.mapsUri ?? null;
          out.push({
            account: account.name,
            name: location.name,
            title: location.title ?? "This business",
            address: [
              ...(location.storefrontAddress?.addressLines ?? []),
              location.storefrontAddress?.locality,
              location.storefrontAddress?.postalCode,
            ]
              .filter(Boolean)
              .join(", "),
            category: location.categories?.primaryCategory?.displayName ?? "",
            placeId: location.metadata?.placeId ?? null,
            cid: mapsUri?.match(/[?&]cid=(\d+)/)?.[1] ?? null,
            mapsUri,
          });
        }
        token = body.nextPageToken;
        if (!token) break;
      }
      return out;
    }),
  );

  const locations = perAccount.flat();
  locationsByUser.set(userId, locations);
  return locations;
}

export type BusinessProfileReview = {
  name: string;
  reviewId: string;
  reviewerName: string;
  reviewerPhoto: string;
  rating: number;
  comment: string;
  createTime: string;
  updateTime: string;
};

type RawReview = {
  name?: string;
  reviewId?: string;
  reviewer?: { displayName?: string; profilePhotoUrl?: string; isAnonymous?: boolean };
  starRating?: string;
  comment?: string;
  createTime?: string;
  updateTime?: string;
};

const STARS: Record<string, number> = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

function toReview(raw: RawReview, resource: string): BusinessProfileReview | null {
  const reviewId = raw.reviewId ?? raw.name?.split("/").pop();
  if (!reviewId) return null;
  return {
    name: raw.name ?? `${resource}/reviews/${reviewId}`,
    reviewId,
    reviewerName: raw.reviewer?.isAnonymous
      ? "Anonymous Google user"
      : (raw.reviewer?.displayName?.trim() ?? "Google user"),
    reviewerPhoto: raw.reviewer?.profilePhotoUrl ?? "",
    rating: STARS[raw.starRating ?? ""] ?? 0,
    comment: raw.comment ?? "",
    createTime: raw.createTime ?? "",
    updateTime: raw.updateTime ?? "",
  };
}

function reviewsResource(location: OwnedLocation) {
  return `${location.account}/locations/${location.name.split("/").pop()}`;
}

/** One specific review, via the official reviews.get endpoint. */
export async function getOwnedReview(
  accessToken: string,
  location: OwnedLocation,
  reviewId: string,
) {
  const resource = reviewsResource(location);
  try {
    const raw = await googleGet<RawReview>(
      `${REVIEWS_API}/${resource}/reviews/${encodeURIComponent(reviewId)}`,
      accessToken,
    );
    return toReview(raw, resource);
  } catch (error) {
    if (error instanceof BusinessProfileError && error.status === 404) return null;
    throw error;
  }
}

/** Reviews for one owned location via the official reviews.list endpoint (paginated). */
export async function listOwnedReviews(
  accessToken: string,
  location: OwnedLocation,
  maxPages = 10,
) {
  const resource = reviewsResource(location);
  const reviews: BusinessProfileReview[] = [];
  let pageToken: string | undefined;
  let totalReviewCount: number | null = null;
  let averageRating: number | null = null;
  for (let page = 0; page < maxPages; page += 1) {
    const body = await googleGet<{
      reviews?: RawReview[];
      nextPageToken?: string;
      totalReviewCount?: number;
      averageRating?: number;
    }>(
      `${REVIEWS_API}/${resource}/reviews?pageSize=50${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
      accessToken,
    );
    totalReviewCount = body.totalReviewCount ?? totalReviewCount;
    averageRating = body.averageRating ?? averageRating;
    for (const raw of body.reviews ?? []) {
      const review = toReview(raw, resource);
      if (review) reviews.push(review);
    }
    pageToken = body.nextPageToken;
    if (!pageToken) break;
  }
  return { reviews, totalReviewCount, averageRating, complete: !pageToken };
}
