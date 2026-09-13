export const VIOLATION_CATEGORIES = [
  "none",
  "spam_or_advertising",
  "fake_or_no_real_experience",
  "conflict_of_interest",
  "off_topic",
  "harassment_or_hate",
  "personal_information",
  "profanity_or_obscenity",
  "impersonation",
  "illegal_or_dangerous",
] as const;

export const CATEGORY_LABELS: Record<string, string> = {
  none: "No violation category",
  spam_or_advertising: "Spam or advertising",
  fake_or_no_real_experience: "Doesn't look like a real visit",
  conflict_of_interest: "Written by a competitor or insider",
  off_topic: "Not about this business",
  harassment_or_hate: "Harassment or hateful language",
  personal_information: "Shares private personal details",
  profanity_or_obscenity: "Offensive language",
  impersonation: "Pretending to be someone else",
  illegal_or_dangerous: "Illegal or dangerous content",
};

export type ReviewVerdict =
  "strong_candidate" | "possible_candidate" | "needs_human_review" | "not_reportable";

export type ReviewAnalysis = {
  verdict: ReviewVerdict;
  headline: string;
  plainSummary: string;
  violationCategory: string;
  policyReasoning: string;
  evidence: string[];
  counterEvidence: string[];
  missingEvidence: string[];
  confidence: number;
  severity: "low" | "medium" | "high";
  rejectionRisk: "low" | "medium" | "high";
  recommendedReportReason: string;
  recommendedAction: string;
  challenge: string;
};

export type BusinessInfo = {
  placeId: string;
  name: string;
  address: string;
  rating: number | null;
  ratingCount: number | null;
  mapsUri: string;
  category: string;
};

export type ReviewInfo = {
  id: string;
  authorName: string;
  authorPhoto: string;
  rating: number;
  text: string;
  relativeTime: string;
  publishTime: string;
  reviewUrl: string;
  identityStatus: "provider_observed" | "exact_url_match" | "official_sync_verified" | "unverified";
  identityMethod:
    | "provider_resource_name"
    | "exact_provider_url"
    | "provider_review_id"
    | "official_review_id"
    | "content_fingerprint";
  identityConfidence: number;
};
