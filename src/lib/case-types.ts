import type { ReviewAnalysis } from "./analysis-types";

export const CASE_STATUSES = [
  "new",
  "reported",
  "pending",
  "removed",
  "rejected",
  "ignored",
] as const;

export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_STATUS_TRANSITIONS: Record<CaseStatus, readonly CaseStatus[]> = {
  new: ["reported", "ignored"],
  reported: ["pending", "removed", "rejected"],
  pending: ["removed", "rejected"],
  removed: [],
  rejected: [],
  ignored: ["new"],
};

export const STATUS_LABELS: Record<CaseStatus, string> = {
  new: "Not reported yet",
  reported: "Reported to Google",
  pending: "Waiting on Google",
  removed: "Review removed",
  rejected: "Google said no",
  ignored: "Left alone",
};

export const STATUS_SHORT: Record<CaseStatus, string> = {
  new: "New",
  reported: "Reported",
  pending: "Waiting",
  removed: "Removed",
  rejected: "Kept",
  ignored: "Ignored",
};

export const STATUS_TONE: Record<CaseStatus, "neutral" | "info" | "warning" | "safe" | "danger"> = {
  new: "neutral",
  reported: "info",
  pending: "warning",
  removed: "safe",
  rejected: "danger",
  ignored: "neutral",
};

export type CaseRecord = {
  id: string;
  locationId: string;
  locationName: string;
  locationAddress: string;
  platform: string;
  sourceUrl: string;
  reviewUrl: string;
  authorName: string;
  reviewRating: number | null;
  reviewText: string;
  reviewRelativeTime: string;
  verdict: string;
  violationCategory: string;
  headline: string;
  plainSummary: string;
  confidence: number;
  severity: string;
  rejectionRisk: string;
  status: CaseStatus;
  statusNote: string;
  reportedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  analysis: ReviewAnalysis | null;
};

export type LocationRecord = {
  id: string;
  name: string;
  address: string;
  category: string;
  mapsUri: string;
  rating: number | null;
  ratingCount: number | null;
  caseCount: number;
  reportedCount: number;
  removedCount: number;
  lastScanAt: string | null;
};

export const VERDICT_LABELS: Record<string, string> = {
  strong_candidate: "Strong case",
  possible_candidate: "Possible case",
  needs_human_review: "Needs your eyes",
  not_reportable: "No violation",
};

export const VERDICT_TONE: Record<string, "safe" | "warning" | "danger" | "info"> = {
  strong_candidate: "danger",
  possible_candidate: "warning",
  needs_human_review: "info",
  not_reportable: "safe",
};

/** Split pasted text into candidate links, de-duplicated and validated. */
export function parseUrlList(input: string) {
  const seen = new Set<string>();
  const rows: { url: string; valid: boolean; reason: string }[] = [];

  for (const raw of input.split(/[\s,]+/)) {
    const value = raw.trim().replace(/[),.]+$/, "");
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    let valid = false;
    let reason = "";
    try {
      const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
      const host = parsed.hostname.toLowerCase();
      if (host.includes("google.") || host.includes("goo.gl")) {
        valid = true;
      } else if (host.includes("facebook.") || host.includes("instagram.")) {
        reason = "Facebook and Instagram aren't connected yet";
      } else {
        reason = "Not a Google review link";
      }
    } catch {
      reason = "Doesn't look like a link";
    }

    rows.push({ url: value, valid, reason });
  }

  return rows;
}
