import type { ReviewAnalysis } from "./analysis-types";
import type { ReportStatus } from "./state-machines";

export type CaseDecision = "reportable" | "not_reportable" | "needs_human_review";

export const DECISION_LABELS: Record<CaseDecision, string> = {
  reportable: "Worth reporting",
  needs_human_review: "Needs your judgement",
  not_reportable: "No violation",
};

export type CaseReportSummary = {
  id: string;
  status: ReportStatus;
  version: number;
  externalReference: string | null;
  submittedAt: string | null;
  decidedAt: string | null;
  updatedAt: string;
};

export type CaseRecord = {
  id: string;
  locationId: string;
  locationName: string;
  locationAddress: string;
  platform: string;
  reviewUrl: string;
  sourceUrl: string;
  authorName: string;
  reviewRating: number | null;
  reviewText: string;
  reviewPublishedAt: string | null;
  identityStatus: string;
  decision: CaseDecision;
  verdict: string;
  violationCategory: string;
  headline: string;
  plainSummary: string;
  confidence: number;
  severity: string;
  rejectionRisk: string;
  modelAgreement: string;
  dismissed: boolean;
  createdAt: string;
  report: CaseReportSummary | null;
  analysis: ReviewAnalysis | null;
};

export type EvidenceItem = {
  id: string;
  kind: "supporting" | "counter" | "missing";
  content: string;
  verified: boolean;
  excerptStart: number | null;
  excerptEnd: number | null;
};

export type ReportEvent = {
  id: string;
  reportId: string;
  fromStatus: string | null;
  toStatus: string;
  note: string;
  externalReference: string | null;
  createdAt: string;
};

export type AiRunSummary = {
  stage: string;
  provider: string;
  model: string;
  status: string;
  durationMs: number;
  confidence: number | null;
  errorCode: string | null;
  createdAt: string;
};

export type CaseDetail = CaseRecord & {
  evidence: EvidenceItem[];
  reports: Array<
    CaseReportSummary & {
      route: string;
      reportReason: string;
      reportBody: string;
      outcomeSource: string | null;
      outcomeNote: string;
    }
  >;
  reportEvents: ReportEvent[];
  aiRuns: AiRunSummary[];
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
/** Canonical form of a pasted link: no fragment, no utm_* tracking parameters, no trailing slash. */
export function canonicalizeUrl(raw: string) {
  try {
    const url = new URL(raw.trim().startsWith("http") ? raw.trim() : `https://${raw.trim()}`);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key);
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return raw.trim();
  }
}

export function parseUrlList(input: string) {
  const seen = new Set<string>();
  const rows: { url: string; valid: boolean; reason: string }[] = [];

  for (const raw of input.split(/[\s,]+/)) {
    const value = raw.trim().replace(/[),.]+$/, "");
    if (!value) continue;
    const key = canonicalizeUrl(value);
    if (seen.has(key)) continue;
    seen.add(key);

    let valid = false;
    let reason = "";
    try {
      const parsed = new URL(value.startsWith("http") ? value : `https://${value}`);
      const host = parsed.hostname.toLowerCase();
      if (host.includes("google.") || host.includes("goo.gl") || host.endsWith("g.page")) {
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
