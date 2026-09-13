import { decryptSecret, encryptSecret } from "./google-business.server";

const ACCOUNTS_API = "https://mybusinessaccountmanagement.googleapis.com/v1";
const INFO_API = "https://mybusinessbusinessinformation.googleapis.com/v1";
const REVIEWS_API = "https://mybusiness.googleapis.com/v4";

const STAR_VALUES: Record<string, number> = {
  ONE: 1,
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
};

export type OwnerReview = {
  id: string;
  authorName: string;
  authorPhoto: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
  reviewUrl: string;
};

export type OwnerLocation = {
  placeId: string;
  name: string;
  address: string;
  category: string;
  mapsUri: string;
  rating: number | null;
  ratingCount: number | null;
  resourceName: string;
  accountName: string;
};

type ConnectionRow = {
  access_token_ciphertext: string;
  refresh_token_ciphertext: string;
  token_expires_at: string;
};

function env(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

async function refreshAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: env("GOOGLE_BUSINESS_CLIENT_ID"),
      client_secret: env("GOOGLE_BUSINESS_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok || typeof payload["access_token"] !== "string") {
    throw new Error("Google refused to refresh the Business Profile connection. Please reconnect.");
  }
  return {
    accessToken: payload["access_token"],
    expiresIn: typeof payload["expires_in"] === "number" ? payload["expires_in"] : 3600,
  };
}

/** Returns a valid access token, refreshing and re-encrypting it when expired. */
export async function getUsableAccessToken(
  admin: { from: (table: string) => any },
  userId: string,
  connection: ConnectionRow,
) {
  const expiresAt = Date.parse(connection.token_expires_at);
  if (Number.isFinite(expiresAt) && expiresAt - Date.now() > 120_000) {
    return decryptSecret(connection.access_token_ciphertext);
  }
  const refreshed = await refreshAccessToken(await decryptSecret(connection.refresh_token_ciphertext));
  await admin
    .from("google_business_connections")
    .update({
      access_token_ciphertext: await encryptSecret(refreshed.accessToken),
      token_expires_at: new Date(Date.now() + refreshed.expiresIn * 1000).toISOString(),
      status: "connected",
      last_error: null,
    })
    .eq("user_id", userId);
  return refreshed.accessToken;
}

async function googleGet(url: string, accessToken: string) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (response.status === 403) {
    throw new Error(
      "Google has not granted this project access to the Business Profile APIs yet. Request API access for your OAuth client, then sync again.",
    );
  }
  if (!response.ok) {
    throw new Error(`Google Business Profile request failed (${response.status}).`);
  }
  return (await response.json()) as Record<string, any>;
}

async function listAccounts(accessToken: string) {
  const names: string[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${ACCOUNTS_API}/accounts`);
    url.searchParams.set("pageSize", "20");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await googleGet(url.toString(), accessToken);
    for (const account of (payload["accounts"] ?? []) as Array<{ name?: string }>) {
      if (account.name) names.push(account.name);
    }
    pageToken = typeof payload["nextPageToken"] === "string" ? payload["nextPageToken"] : undefined;
  } while (pageToken && names.length < 100);
  return names;
}

async function listLocations(accountName: string, accessToken: string): Promise<OwnerLocation[]> {
  const locations: OwnerLocation[] = [];
  let pageToken: string | undefined;
  do {
    const url = new URL(`${INFO_API}/${accountName}/locations`);
    url.searchParams.set("pageSize", "100");
    url.searchParams.set(
      "readMask",
      "name,title,storefrontAddress,categories,metadata,websiteUri",
    );
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await googleGet(url.toString(), accessToken);
    for (const location of (payload["locations"] ?? []) as Array<Record<string, any>>) {
      const resourceName: string = location["name"] ?? "";
      if (!resourceName) continue;
      const address = (location["storefrontAddress"]?.["addressLines"] ?? []) as string[];
      const locality = [location["storefrontAddress"]?.["locality"], location["storefrontAddress"]?.["postalCode"]]
        .filter(Boolean)
        .join(" ");
      locations.push({
        placeId: location["metadata"]?.["placeId"] ?? resourceName.split("/").pop() ?? resourceName,
        name: location["title"] ?? "Unnamed listing",
        address: [...address, locality].filter(Boolean).join(", "),
        category: location["categories"]?.["primaryCategory"]?.["displayName"] ?? "",
        mapsUri: location["metadata"]?.["mapsUri"] ?? "",
        rating: null,
        ratingCount: null,
        resourceName,
        accountName,
      });
    }
    pageToken = typeof payload["nextPageToken"] === "string" ? payload["nextPageToken"] : undefined;
  } while (pageToken && locations.length < 200);
  return locations;
}

async function listReviews(location: OwnerLocation, accessToken: string, maxReviews: number) {
  const reviews: OwnerReview[] = [];
  const locationId = location.resourceName.split("/").pop();
  let pageToken: string | undefined;
  do {
    const url = new URL(`${REVIEWS_API}/${location.accountName}/locations/${locationId}/reviews`);
    url.searchParams.set("pageSize", "50");
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const payload = await googleGet(url.toString(), accessToken);
    for (const review of (payload["reviews"] ?? []) as Array<Record<string, any>>) {
      const reviewId: string = review["reviewId"] ?? review["name"] ?? "";
      if (!reviewId) continue;
      reviews.push({
        id: `gbp:${locationId}:${reviewId}`,
        authorName: review["reviewer"]?.["displayName"] ?? "Google user",
        authorPhoto: review["reviewer"]?.["profilePhotoUrl"] ?? "",
        rating: STAR_VALUES[review["starRating"] as string] ?? 0,
        text: review["comment"] ?? "",
        relativeTime: review["updateTime"] ?? review["createTime"] ?? "",
        publishTime: review["createTime"] ?? "",
        reviewUrl: location.mapsUri || "",
      });
      if (reviews.length >= maxReviews) return reviews;
    }
    pageToken = typeof payload["nextPageToken"] === "string" ? payload["nextPageToken"] : undefined;
  } while (pageToken);
  return reviews;
}

export async function fetchOwnerReviews(accessToken: string, maxReviewsPerLocation: number) {
  const accounts = await listAccounts(accessToken);
  const results: Array<{ location: OwnerLocation; reviews: OwnerReview[] }> = [];
  for (const account of accounts) {
    for (const location of await listLocations(account, accessToken)) {
      results.push({ location, reviews: await listReviews(location, accessToken, maxReviewsPerLocation) });
    }
  }
  return results;
}
