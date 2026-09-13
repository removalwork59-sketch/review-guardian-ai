/**
 * AI orchestration for one real review:
 *
 *   review → fast classification (OpenAI) ┐
 *          → independent second opinion (Claude) ┘ in parallel
 *          → critique + final decision (Claude; OpenAI if Claude is unavailable)
 *          → evidence verification against the stored review text (deterministic)
 *          → consensus guard (disagreement caps the verdict)
 *
 * Every model stage is reported through `onStage` so it can be audited, including failures.
 */
import { z } from "zod";

import { generateStrictJson, hasOpenAi, openAiModel, strictObject } from "./ai-responses.server";
import { claudeModel, generateClaudeJson, hasClaude } from "./claude.server";
import { FriendlyError } from "./google.server";
import { VIOLATION_CATEGORIES } from "./analysis-types";
import type { ReviewAnalysis } from "./analysis-types";
import type { NormalizedBusiness, NormalizedReview } from "./google.server";

export type { ReviewAnalysis };

export const PROMPT_VERSION = "review-policy-multimodel-v4";
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

export const firstPassValidator = z.object({
  likelyViolation: z.boolean(),
  violationCategory: z.enum(VIOLATION_CATEGORIES),
  policyReasoning: z.string(),
  evidence: z.array(z.string()),
  counterEvidence: z.array(z.string()),
  missingEvidence: z.array(z.string()),
  severity: z.enum(["low", "medium", "high"]),
  confidence: z.number(),
});

export const finalValidator = z.object({
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

export type AnalysisStage = "fast_classification" | "second_opinion" | "final_decision";

export type StageRun = {
  stage: AnalysisStage;
  provider: "openai" | "anthropic";
  model: string;
  status: "completed" | "failed";
  durationMs: number;
  output: unknown;
  confidence: number | null;
  errorCode: string | null;
};

export type VerifiedQuote = { content: string; start: number; end: number };

export type AnalysisRun = {
  analysis: ReviewAnalysis;
  models: string[];
  agreement: "agree" | "disagree" | "single_model";
  droppedEvidence: number;
  supportingEvidence: VerifiedQuote[];
};

const POLICY_CONTEXT = `You assess public reviews against the kinds of content policies major review platforms publish
(spam and advertising, fake engagement or content from someone with no real experience, conflicts of interest,
off-topic content, harassment and hate speech, personal information, obscenity, impersonation, illegal content).
A negative, angry, or unfair review is NOT a policy violation by itself. Poor service, high prices, long waits,
rude staff and disappointment are legitimate review topics. Only flag content where the text itself gives concrete
signals of a policy breach. Every "evidence" item must be an exact, verbatim quote copied from the review text;
anything that is not a verbatim quote belongs in "missingEvidence" or "counterEvidence" instead. Write every
user-facing sentence in plain English a shop owner would understand: no jargon, no policy codes, no legal language.`;

const FIRST_PASS_INSTRUCTIONS = `${POLICY_CONTEXT}\n\nAnalyse this review for possible policy violations. Confidence is 0-100.`;

const FINAL_INSTRUCTIONS = `${POLICY_CONTEXT}

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

export function reviewContext(business: NormalizedBusiness, review: NormalizedReview) {
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

// ---------------------------------------------------------------------------------------------
// Deterministic evidence verification and decision guards (pure; unit tested)
// ---------------------------------------------------------------------------------------------
const QUOTE_MARKS = /["'`‘’“”]/g;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Finds a quote in the review, tolerant of case, spacing and quotation marks; returns real offsets. */
export function locateExcerpt(
  text: string,
  candidate: string,
): { start: number; end: number } | null {
  const words = candidate.replace(QUOTE_MARKS, " ").trim().split(/\s+/).filter(Boolean);
  if (words.join(" ").length < 3) return null;
  const pattern = new RegExp(words.map(escapeRegExp).join("[\\s\"'`‘’“”]+"), "i");
  const match = pattern.exec(text);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

/**
 * Keeps only evidence that exists in the review text. Each quoted fragment becomes its own verified
 * quote whose content is copied from the review itself; an item with any unfound fragment is dropped.
 */
export function validateEvidence(evidence: string[], reviewText: string) {
  const kept: VerifiedQuote[] = [];
  let dropped = 0;
  if (!reviewText.trim()) return { kept, dropped: evidence.length };

  for (const item of evidence) {
    const quoted = [...item.matchAll(/["“]([^"”]{3,})["”]/g)].map((match) => match[1] ?? "");
    const fragments = quoted.length > 0 ? quoted : [item];
    const located = fragments.map((fragment) => locateExcerpt(reviewText, fragment));
    if (!located.every(Boolean)) {
      dropped += 1;
      continue;
    }
    for (const position of located as Array<{ start: number; end: number }>) {
      if (kept.some((quote) => quote.start === position.start && quote.end === position.end))
        continue;
      kept.push({ content: reviewText.slice(position.start, position.end), ...position });
    }
  }
  return { kept: kept.sort((a, b) => a.start - b.start), dropped };
}

export function applyDecisionGuards(input: {
  final: ReviewAnalysis;
  violationVotes: boolean[];
  reviewText: string;
}): Omit<AnalysisRun, "models"> {
  const analysis: ReviewAnalysis = {
    ...input.final,
    confidence: Math.max(0, Math.min(100, Math.round(input.final.confidence))),
    counterEvidence: input.final.counterEvidence.slice(0, 8),
    missingEvidence: input.final.missingEvidence.slice(0, 8),
  };

  const { kept, dropped } = validateEvidence(input.final.evidence, input.reviewText);
  const supportingEvidence = kept.slice(0, 8);
  analysis.evidence = supportingEvidence.map((quote) => quote.content);

  const reportable = () =>
    analysis.verdict === "strong_candidate" || analysis.verdict === "possible_candidate";
  if (reportable() && supportingEvidence.length === 0) {
    analysis.verdict = "needs_human_review";
    analysis.confidence = Math.min(analysis.confidence, 50);
    analysis.missingEvidence = [
      "None of the AI's quoted evidence could be found word-for-word in the review, so it was not used.",
      ...analysis.missingEvidence,
    ].slice(0, 8);
  }

  let agreement: AnalysisRun["agreement"] = "single_model";
  if (input.violationVotes.length >= 2) {
    const yes = input.violationVotes.filter(Boolean).length;
    agreement = yes === 0 || yes === input.violationVotes.length ? "agree" : "disagree";
    if (yes === 0 && reportable()) {
      analysis.verdict = "needs_human_review";
      analysis.confidence = Math.min(analysis.confidence, 50);
    } else if (agreement === "disagree" && analysis.verdict === "strong_candidate") {
      analysis.verdict = "possible_candidate";
      analysis.confidence = Math.min(analysis.confidence, 69);
    }
  }
  if (analysis.verdict === "not_reportable") analysis.violationCategory = "none";

  return { analysis, agreement, droppedEvidence: dropped, supportingEvidence };
}

// ---------------------------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------------------------
async function runStage<T extends { confidence: number }>(
  meta: { stage: AnalysisStage; provider: StageRun["provider"]; model: string },
  onStage: ((run: StageRun) => void) | undefined,
  task: () => Promise<T>,
): Promise<T> {
  const started = Date.now();
  try {
    const output = await task();
    onStage?.({
      ...meta,
      status: "completed",
      durationMs: Date.now() - started,
      output,
      confidence: Math.round(output.confidence),
      errorCode: null,
    });
    return output;
  } catch (error) {
    onStage?.({
      ...meta,
      status: "failed",
      durationMs: Date.now() - started,
      output: {},
      confidence: null,
      errorCode:
        error instanceof FriendlyError ? (error.code ?? "provider_error") : "internal_error",
    });
    throw error;
  }
}

export async function analyzeReview(
  business: NormalizedBusiness,
  review: NormalizedReview,
): Promise<ReviewAnalysis> {
  return (await analyzeReviewDetailed(business, review)).analysis;
}

export async function analyzeReviewDetailed(
  business: NormalizedBusiness,
  review: NormalizedReview,
  options: { onStage?: (run: StageRun) => void } = {},
): Promise<AnalysisRun> {
  const openAi = hasOpenAi();
  const claude = hasClaude();
  if (!openAi && !claude) {
    throw new FriendlyError("The AI service isn't configured yet.", "", {
      code: "ai_configuration",
    });
  }

  const context = reviewContext(business, review);
  const openAiLabel = `openai:${openAiModel()}`;
  const claudeLabel = `anthropic:${claudeModel()}`;

  const [fast, second] = await Promise.allSettled([
    openAi
      ? runStage(
          { stage: "fast_classification", provider: "openai", model: openAiModel() },
          options.onStage,
          () =>
            generateStrictJson<FirstPass>({
              instructions: FIRST_PASS_INSTRUCTIONS,
              input: context,
              schemaName: "initial_policy_analysis",
              schema: firstPassSchema,
              validate: (value) => firstPassValidator.parse(value),
              effort: "low",
            }),
        )
      : Promise.reject(new Error("OpenAI is not configured")),
    claude
      ? runStage(
          { stage: "second_opinion", provider: "anthropic", model: claudeModel() },
          options.onStage,
          () =>
            generateClaudeJson<FirstPass>({
              system: FIRST_PASS_INSTRUCTIONS,
              input: context,
              schema: firstPassSchema,
              validate: (value) => firstPassValidator.parse(value),
              effort: "medium",
            }),
        )
      : Promise.reject(new Error("Claude is not configured")),
  ]);

  const opinions: Array<{ model: string; analysis: FirstPass }> = [];
  if (fast.status === "fulfilled") opinions.push({ model: openAiLabel, analysis: fast.value });
  if (second.status === "fulfilled") opinions.push({ model: claudeLabel, analysis: second.value });
  if (opinions.length === 0) {
    const friendly = [fast, second].find(
      (result): result is PromiseRejectedResult =>
        result.status === "rejected" && result.reason instanceof FriendlyError,
    );
    throw (
      friendly?.reason ??
      new FriendlyError("The AI couldn't finish checking this review.", "Please try again.", {
        code: "ai_unavailable",
      })
    );
  }

  const finalInput = `${context}\n\nIndependent first analyses (JSON):\n${JSON.stringify(opinions)}`;
  const final = claude
    ? await runStage(
        { stage: "final_decision", provider: "anthropic", model: claudeModel() },
        options.onStage,
        () =>
          generateClaudeJson<ReviewAnalysis>({
            system: FINAL_INSTRUCTIONS,
            input: finalInput,
            schema: finalSchema,
            validate: (value) => finalValidator.parse(value),
            effort: "high",
          }),
      )
    : await runStage(
        { stage: "final_decision", provider: "openai", model: openAiModel() },
        options.onStage,
        () =>
          generateStrictJson<ReviewAnalysis>({
            instructions: FINAL_INSTRUCTIONS,
            input: finalInput,
            schemaName: "final_policy_decision",
            schema: finalSchema,
            validate: (value) => finalValidator.parse(value),
            effort: "medium",
          }),
      );

  const models = [
    ...new Set([...opinions.map((opinion) => opinion.model), claude ? claudeLabel : openAiLabel]),
  ];
  const guarded = applyDecisionGuards({
    final,
    violationVotes: opinions.map((opinion) => opinion.analysis.likelyViolation),
    reviewText: review.text,
  });
  return { ...guarded, models };
}
