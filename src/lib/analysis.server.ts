import { generateStrictJson, strictObject } from "./ai-responses.server";
import { z } from "zod";
import { VIOLATION_CATEGORIES } from "./analysis-types";
import type { ReviewAnalysis } from "./analysis-types";
import type { NormalizedBusiness, NormalizedReview } from "./google.server";

export type { ReviewAnalysis };

const firstPassSchema = strictObject({
  likelyViolation: { type: "boolean" },
  violationCategory: { type: "string", enum: [...VIOLATION_CATEGORIES] },
  policyReasoning: { type: "string" },
  evidence: { type: "array", items: { type: "string" } },
  counterEvidence: { type: "array", items: { type: "string" } },
  missingEvidence: { type: "array", items: { type: "string" } },
  severity: { type: "string", enum: ["low", "medium", "high"] },
  confidence: { type: "number" },
});

const finalSchema = strictObject({
  verdict: {
    type: "string",
    enum: ["strong_candidate", "possible_candidate", "needs_human_review", "not_reportable"],
  },
  headline: { type: "string" },
  plainSummary: { type: "string" },
  violationCategory: { type: "string", enum: [...VIOLATION_CATEGORIES] },
  policyReasoning: { type: "string" },
  evidence: { type: "array", items: { type: "string" } },
  counterEvidence: { type: "array", items: { type: "string" } },
  missingEvidence: { type: "array", items: { type: "string" } },
  confidence: { type: "number" },
  severity: { type: "string", enum: ["low", "medium", "high"] },
  rejectionRisk: { type: "string", enum: ["low", "medium", "high"] },
  recommendedReportReason: { type: "string" },
  recommendedAction: { type: "string" },
  challenge: { type: "string" },
});

const firstPassValidator = z.object({
  likelyViolation: z.boolean(),
  violationCategory: z.enum(VIOLATION_CATEGORIES),
  policyReasoning: z.string(),
  evidence: z.array(z.string()),
  counterEvidence: z.array(z.string()),
  missingEvidence: z.array(z.string()),
  severity: z.enum(["low", "medium", "high"]),
  confidence: z.number(),
});

const finalValidator = z.object({
  verdict: z.enum(["strong_candidate", "possible_candidate", "needs_human_review", "not_reportable"]),
  headline: z.string(),
  plainSummary: z.string(),
  violationCategory: z.enum(VIOLATION_CATEGORIES),
  policyReasoning: z.string(),
  evidence: z.array(z.string()),
  counterEvidence: z.array(z.string()),
  missingEvidence: z.array(z.string()),
  confidence: z.number(),
  severity: z.enum(["low", "medium", "high"]),
  rejectionRisk: z.enum(["low", "medium", "high"]),
  recommendedReportReason: z.string(),
  recommendedAction: z.string(),
  challenge: z.string(),
});

const POLICY_CONTEXT = `You assess public reviews against the kinds of content policies major review platforms publish
(spam and advertising, fake engagement or content from someone with no real experience, conflicts of interest,
off-topic content, harassment and hate speech, personal information, obscenity, impersonation, illegal content).
A negative, angry, or unfair review is NOT a policy violation by itself. Poor service, high prices, long waits,
rude staff and disappointment are legitimate review topics. Only flag content where the text itself gives concrete
signals of a policy breach. Write every user-facing sentence in plain English a shop owner would understand:
no jargon, no policy codes, no legal language.`;

function reviewContext(business: NormalizedBusiness, review: NormalizedReview) {
  return [
    `Business: ${business.name}`,
    business.category ? `Type of business: ${business.category}` : "",
    business.address ? `Address: ${business.address}` : "",
    business.rating ? `Overall rating: ${business.rating} from ${business.ratingCount ?? "unknown"} reviews` : "",
    "",
    `Review rating: ${review.rating} out of 5`,
    `Reviewer name shown: ${review.authorName}`,
    `Posted: ${review.relativeTime || review.publishTime || "unknown"}`,
    "Review text:",
    review.text ? `"""${review.text}"""` : "(the reviewer left a rating with no written text)",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function analyzeReview(
  business: NormalizedBusiness,
  review: NormalizedReview,
): Promise<ReviewAnalysis> {
  const context = reviewContext(business, review);

  const pass1 = await generateStrictJson({
    instructions: `${POLICY_CONTEXT}\n\nStep 1: analyse this review for possible policy violations. Quote only wording that is actually present. Confidence is 0-100.`,
    input: context,
    schemaName: "initial_policy_analysis",
    schema: firstPassSchema,
    validate: (value) => firstPassValidator.parse(value),
  });

  const final = await generateStrictJson<ReviewAnalysis>({
    instructions: `${POLICY_CONTEXT}

Step 2: challenge the first analysis. Argue the strongest honest case that this is a legitimate review from a
real unhappy customer, then decide.

Verdict rules:
- "strong_candidate": the text itself contains clear, quotable evidence of a policy breach.
- "possible_candidate": real signals, but a platform reviewer could reasonably disagree.
- "needs_human_review": it depends on facts only the business owner knows.
- "not_reportable": negative or unfair, but within the rules.

Never treat a low rating or harsh criticism alone as a violation. "headline" is one short sentence.
"plainSummary" is 2-3 short sentences for a non-technical business owner. "challenge" states the best
counter-argument in one or two sentences. "recommendedAction" is what the owner should do next in plain words.
If the verdict is "not_reportable", violationCategory must be "none" and recommendedReportReason must explain
that no report should be filed.`,
    input: `${context}\n\nFirst analysis (JSON):\n${JSON.stringify(pass1)}`,
    schemaName: "final_policy_decision",
    schema: finalSchema,
    validate: (value) => finalValidator.parse(value),
  });

  return {
    ...final,
    confidence: Math.max(0, Math.min(100, Math.round(final.confidence))),
    evidence: final.evidence.slice(0, 8),
    counterEvidence: final.counterEvidence.slice(0, 8),
    missingEvidence: final.missingEvidence.slice(0, 8),
  };
}
