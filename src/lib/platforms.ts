export type PlatformId = "google" | "facebook" | "instagram" | "unknown";

export type PlatformInfo = {
  id: PlatformId;
  label: string;
  supported: boolean;
  /** Plain-language note about what we can and cannot do for this platform today. */
  note: string;
};

export const PLATFORMS: Record<PlatformId, PlatformInfo> = {
  google: {
    id: "google",
    label: "Google",
    supported: true,
    note: "We can look up the business and the reviews Google makes publicly available.",
  },
  facebook: {
    id: "facebook",
    label: "Facebook",
    supported: false,
    note: "Facebook reviews need a Meta business connection that isn't set up yet.",
  },
  instagram: {
    id: "instagram",
    label: "Instagram",
    supported: false,
    note: "Instagram content needs a Meta business connection that isn't set up yet.",
  },
  unknown: {
    id: "unknown",
    label: "Unsupported link",
    supported: false,
    note: "We couldn't recognise this link as a review page we support.",
  },
};

export function detectPlatform(rawUrl: string): PlatformId {
  const url = rawUrl.trim().toLowerCase();
  if (!url) return "unknown";
  if (
    url.includes("google.com/maps") ||
    url.includes("maps.app.goo.gl") ||
    url.includes("goo.gl/maps") ||
    url.includes("share.google") ||
    url.includes("google.com/search") ||
    url.includes("g.page")
  ) {
    return "google";
  }
  if (url.includes("facebook.com") || url.includes("fb.com") || url.includes("fb.me")) {
    return "facebook";
  }
  if (url.includes("instagram.com")) return "instagram";
  return "unknown";
}

export function looksLikeUrl(value: string) {
  const v = value.trim();
  return /^https?:\/\/\S+\.\S+/i.test(v);
}
