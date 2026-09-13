import { z } from "zod";

import { generateStrictJson, hasOpenAi, openAiModel, strictObject } from "./ai-responses.server";
import { claudeModel, generateClaudeJson, hasClaude } from "./claude.server";
import { FriendlyError } from "./google.server";
import { VIOLATION_CATEGORIES } from "./analysis-types";
import type { ReviewAnalysis } from "./analysis-types";
import type { NormalizedBusiness, NormalizedReview } from "./google.server";

export type { ReviewAnalysis };

export const PROMPT_VERSION = "review-policy-multimodel-v3";
export const POLICY_VERSION = "google-content-policy-2026-09";

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
  verdict: z.enum([
    "strong_candidate",
    "possible_candidate",
    "needs_human_review",
    "not_reportable",
  ]),
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

type FirstPass = z.infer<typeof firstPassValidator>;

const POLICY_CONTEXT = `You assess public reviews against the kinds of content policies major review platforms publish
(spam and advertising, fake engagement or content from someone with no real experience, conflicts of interest,
off-topic content, harassment and hate speech, personal information, obscenity, impersonation, illegal content).
A negative, angry, or unfair review is NOT a policy violation by itself. Poor service, high prices, long waits,
rude staff and disappointment are legitimate review topics. Only flag content where the text itself gives concrete
signals of a policy breach. Every "evidence" item must be an exact, verbatim quote copied from the review text;
anything that is not a verbatim quote belongs in "missingEvidence" or "counterEvidence" instead. Write every
user-facing sentence in plain English a shop owner would understand: no jargon, no policy codes, no legal language.`;

const FIRST_PASS_INSTRUCTIONS = `${POLICY_CONTEXT}\n\nAnalyse this review for possible policy violations. Confidence is 0-100.`;

function reviewContext(business: NormalizedBusiness, review: NormalizedReview) {
  return [
    `Business: ${business.name}`,
    business.category ? `Type of business: ${business.category}` : "",
    business.address ? `Address: ${business.address}` : "",
    business.rating
      ? `Overall rating: ${business.rating} from ${business.ratingCount ?? "unknown"} reviews`
      : "",
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

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[‘’“”"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Keeps only evidence that is actually present in the review text; never trusts the model's quotes. */
export function validateEvidence(evidence: string[], reviewText: string) {
  const haystack = normalizeForMatch(reviewText);
  const kept: string[] = [];
  let dropped = 0;
  for (const item of evidence) {
    const quoted = [...item.matchAll(/["“]([^"”]{3,})["”]/g)].map((match) => match[1] ?? "");
    const candidates = quoted.length > 0 ? quoted : [item];
    const present = candidates.every((candidate) => {
      const needle = normalizeForMatch(candidate);
      return needle.length >= 3 && haystack.includes(needle);
    });
    if (present && haystack) kept.push(item);
    else dropped += 1;
  }
  return { kept, dropped };
}

export type AnalysisRun = {
  analysis: ReviewAnalysis;
  models: string[];
  droppedEvidence: number;
  agreement: "agree" | "disagree" | "single_model";
};

export async function analyzeReview(
  business: NormalizedBusiness,
  review: NormalizedReview,
): Promise<ReviewAnalysis> {
  return (await analyzeReviewDetailed(business, review)).analysis;
}

/**
 * Fast analysis (OpenAI) and an independent second opinion (Claude) run in parallel; Claude then
 * challenges both and decides. Evidence is verified against the real review text in code, and
 * disagreement between the models caps how strong the final verdict can be.
 */
export async function analyzeReviewDetailed(
  business: NormalizedBusiness,
  review: NormalizedReview,
): Promise<AnalysisRun> {
  const openAi = hasOpenAi();
  const claude = hasClaude();
  if (!openAi && !claude) {
    throw new FriendlyError("The AI service isn't configured yet.", "");
  }

  const context = reviewContext(business, review);
  const models: string[] = [];

  const firstPasses = await Promise.allSettled([
    openAi
      ? generateStrictJson({
          instructions: FIRST_PASS_INSTRUCTIONS,
          input: context,
          schemaName: "initial_policy_analysis",
          schema: firstPassSchema,
          validate: (value) => firstPassValidator.parse(value),
          effort: "low",
        })
      : Promise.reject(new Error("openai not configured")),
    claude
      ? generateClaudeJson({
          system: FIRST_PASS_INSTRUCTIONS,
          input: context,
          schema: firstPassSchema,
          validate: (value) => firstPassValidator.parse(value),
          effort: "medium",
        })
      : Promise.reject(new Error("claude not configured")),
  ]);

  const opinions: Array<{ source: string; pass: FirstPass }> = [];
  const [fast, second] = firstPasses;
  if (fast.status === "fulfilled") {
    opinions.push({ source: `openai:${openAiModel()}`, pass: fast.value });
    models.push(`openai:${openAiModel()}`);
  }
  if (second.status === "fulfilled") {
    opinions.push({ source: `anthropic:${claudeModel()}`, pass: second.value });
    if (!models.includes(`anthropic:${claudeModel()}`)) models.push(`anthropic:${claudeModel()}`);
  }
  if (opinions.length === 0) {
    const reason = [fast, second].find(
      (result): result is PromiseRejectedResult =>
        result.status === "rejected" && result.reason instanceof FriendlyError,
    );
    throw (
      reason?.reason ??
      new FriendlyError("The AI couldn't finish checking this review.", "Please try again.")
    );
  }

  const finalInstructions = `${POLICY_CONTEXT}

You are the final reviewer. You receive one or more independent first analyses from different models.
First critique them: argue the strongest honest case that this is a legitimate review from a real unhappy
customer, point out any claimed evidence that is not actually in the review text, then decide.

Verdict rules:
- "strong_candidate": the text itself contains clear, quotable evidence of a policy breach.
- "possible_candidate": real signals, but a platform reviewer could reasonably disagree.
- "needs_human_review": it depends on facts only the business owner knows.
- "not_reportable": negative or unfair, but within the rules.

Never treat a low rating or harsh criticism alone as a violation. "headline" is one short sentence.
"plainSummary" is 2-3 short sentences for a non-technical business owner. "challenge" states the best
counter-argument in one or two sentences. "recommendedAction" is what the owner should do next in plain words.
If the verdict is "not_reportable", violationCategory must be "none" and recommendedReportReason must explain
that no report should be filed.`;

  const finalInput = `${context}\n\nIndependent first analyses (JSON):\n${JSON.stringify(
    opinions.map((opinion) => ({ model: opinion.source, analysis: opinion.pass })),
  )}`;

  const final = claude
    ? await generateClaudeJson({
        system: finalInstructions,
        input: finalInput,
        schema: finalSchema,
        validate: (value) => finalValidator.parse(value),
        effort: "high",
      })
    : await generateStrictJson({
        instructions: finalInstructions,
        input: finalInput,
        schemaName: "final_policy_decision",
        schema: finalSchema,
        validate: (value) => finalValidator.parse(value),
        effort: "medium",
      });
  const finalModel = claude ? `anthropic:${claudeModel()}` : `openai:${openAiModel()}`;
  if (!models.includes(finalModel)) models.push(finalModel);

  const analysis: ReviewAnalysis = {
    ...final,
    confidence: Math.max(0, Math.min(100, Math.round(final.confidence))),
    counterEvidence: final.counterEvidence.slice(0, 8),
    missingEvidence: final.missingEvidence.slice(0, 8),
  };

  // Evidence validation: drop anything that is not really in the review.
  const { kept, dropped } = validateEvidence(final.evidence, review.text);
  analysis.evidence = kept.slice(0, 8);
  const reportable =
    analysis.verdict === "strong_candidate" || analysis.verdict === "possible_candidate";
  if (reportable && kept.length === 0) {
    analysis.verdict = "needs_human_review";
    analysis.confidence = Math.min(analysis.confidence, 50);
    analysis.missingEvidence = [
      "None of the AI's quoted evidence could be found word-for-word in the review, so it was not used.",
      ...analysis.missingEvidence,
    ].slice(0, 8);
  }

  // Consensus guard: a verdict can't be stronger than the independent opinions support.
  let agreement: AnalysisRun["agreement"] = "single_model";
  if (opinions.length >= 2) {
    const votes = opinions.filter((opinion) => opinion.pass.likelyViolation).length;
    agreement = votes === 0 || votes === opinions.length ? "agree" : "disagree";
    if (
      votes === 0 &&
      (analysis.verdict === "strong_candidate" || analysis.verdict === "possible_candidate")
    ) {
      analysis.verdict = "needs_human_review";
      analysis.confidence = Math.min(analysis.confidence, 50);
    } else if (agreement === "disagree" && analysis.verdict === "strong_candidate") {
      analysis.verdict = "possible_candidate";
      analysis.confidence = Math.min(analysis.confidence, 69);
    }
  }
  if (analysis.verdict === "not_reportable") analysis.violationCategory = "none";

  return { analysis, models, droppedEvidence: dropped, agreement };
}
