import { describe, expect, it } from "vitest";

import { applyDecisionGuards, locateExcerpt, validateEvidence } from "@/lib/analysis.server";
import type { ReviewAnalysis } from "@/lib/analysis-types";

const REVIEW = "Terrible wait. Call 555-0100 for CHEAP tickets!! Don't come here.";
const QUOTE = "Call 555-0100 for CHEAP tickets";

const decision: ReviewAnalysis = {
  verdict: "strong_candidate",
  headline: "Advertises a phone number",
  plainSummary: "The review promotes a ticket seller.",
  violationCategory: "spam_or_advertising",
  policyReasoning: "Promotional content.",
  evidence: [],
  counterEvidence: ["The reviewer may have waited a long time."],
  missingEvidence: [],
  confidence: 88.4,
  severity: "high",
  rejectionRisk: "low",
  recommendedReportReason: "Spam",
  recommendedAction: "Report it on Google.",
  challenge: "It could be a genuine complaint.",
};

describe("locateExcerpt", () => {
  it("finds a quote regardless of case and spacing, returning offsets into the real text", () => {
    const hit = locateExcerpt(REVIEW, "call 555-0100   for cheap tickets");
    expect(hit).not.toBeNull();
    expect(REVIEW.slice(hit!.start, hit!.end)).toBe(QUOTE);
  });

  it("treats straight and curly apostrophes as the same", () => {
    const hit = locateExcerpt(REVIEW, "Don’t come here");
    expect(REVIEW.slice(hit!.start, hit!.end)).toBe("Don't come here");
  });

  it("returns nothing for words that are not in the review", () => {
    expect(locateExcerpt(REVIEW, "they stole my wallet")).toBeNull();
  });

  it("ignores fragments too short to count as evidence", () => {
    expect(locateExcerpt(REVIEW, "a")).toBeNull();
  });
});

describe("validateEvidence", () => {
  it("keeps real quotes, copied from the review itself, and drops invented ones", () => {
    const { kept, dropped } = validateEvidence(
      [`"call 555-0100 for cheap tickets"`, `"they stole my wallet"`],
      REVIEW,
    );
    const start = REVIEW.indexOf(QUOTE);
    expect(kept).toEqual([{ content: QUOTE, start, end: start + QUOTE.length }]);
    expect(dropped).toBe(1);
  });

  it("drops a whole item when any quoted fragment is invented", () => {
    expect(
      validateEvidence([`Says "Terrible wait" and "free drinks for five stars"`], REVIEW),
    ).toEqual({ kept: [], dropped: 1 });
  });

  it("splits several real quotes into separate verified excerpts", () => {
    const { kept } = validateEvidence([`"Terrible wait" and "Don't come here"`], REVIEW);
    expect(kept.map((quote) => quote.content)).toEqual(["Terrible wait", "Don't come here"]);
  });

  it("verifies nothing when the review has no text", () => {
    expect(validateEvidence([`"anything at all"`], "")).toEqual({ kept: [], dropped: 1 });
  });
});

describe("applyDecisionGuards", () => {
  it("keeps a strong verdict when both models agree and the evidence is real", () => {
    const result = applyDecisionGuards({
      final: { ...decision, evidence: [`"${QUOTE}"`] },
      violationVotes: [true, true],
      reviewText: REVIEW,
    });
    expect(result.analysis.verdict).toBe("strong_candidate");
    expect(result.analysis.confidence).toBe(88);
    expect(result.agreement).toBe("agree");
    expect(result.supportingEvidence).toHaveLength(1);
    expect(result.analysis.evidence).toEqual([QUOTE]);
  });

  it("downgrades a reportable verdict when none of its evidence exists in the review", () => {
    const result = applyDecisionGuards({
      final: { ...decision, evidence: [`"free drinks for five stars"`] },
      violationVotes: [true, true],
      reviewText: REVIEW,
    });
    expect(result.analysis.verdict).toBe("needs_human_review");
    expect(result.analysis.confidence).toBeLessThanOrEqual(50);
    expect(result.supportingEvidence).toEqual([]);
    expect(result.droppedEvidence).toBe(1);
  });

  it("caps a strong verdict when the independent models disagree", () => {
    const result = applyDecisionGuards({
      final: { ...decision, evidence: [`"${QUOTE}"`] },
      violationVotes: [true, false],
      reviewText: REVIEW,
    });
    expect(result.agreement).toBe("disagree");
    expect(result.analysis.verdict).toBe("possible_candidate");
    expect(result.analysis.confidence).toBeLessThanOrEqual(69);
  });

  it("never reports what both independent opinions rejected", () => {
    const result = applyDecisionGuards({
      final: { ...decision, evidence: [`"${QUOTE}"`] },
      violationVotes: [false, false],
      reviewText: REVIEW,
    });
    expect(result.analysis.verdict).toBe("needs_human_review");
  });

  it("clears the violation category for a review that stays within the rules", () => {
    const result = applyDecisionGuards({
      final: { ...decision, verdict: "not_reportable" },
      violationVotes: [false],
      reviewText: REVIEW,
    });
    expect(result.analysis.violationCategory).toBe("none");
    expect(result.agreement).toBe("single_model");
  });
});
