import Anthropic from "@anthropic-ai/sdk";

import { describeAiFailure } from "./ai-gateway.server";
import { FriendlyError } from "./google.server";

let client: Anthropic | undefined;

function apiKey() {
  return process.env["ANTHROPIC_API_KEY"] ?? process.env["CLAUDE_API_KEY"];
}

export function hasClaude() {
  return Boolean(apiKey());
}

export function claudeModel() {
  return process.env["CLAUDE_MODEL"] || "claude-opus-5";
}

function getClient() {
  const key = apiKey();
  if (!key) throw new FriendlyError("The AI service isn't configured yet.", "");
  client ??= new Anthropic({ apiKey: key, maxRetries: 2, timeout: 180_000 });
  return client;
}

/**
 * Asks Claude for a JSON object that matches `schema` (structured outputs), then validates it.
 * Server-side fallback is enabled so a classifier refusal is retried on Anthropic's
 * recommended fallback model instead of failing the analysis outright.
 */
export async function generateClaudeJson<T>(args: {
  system: string;
  input: string;
  schema: Record<string, unknown>;
  validate: (value: unknown) => T;
  effort?: "low" | "medium" | "high";
}): Promise<T> {
  const params = {
    model: claudeModel(),
    max_tokens: 16000,
    system: args.system,
    messages: [{ role: "user" as const, content: args.input }],
    output_config: {
      effort: args.effort ?? "high",
      format: { type: "json_schema" as const, schema: args.schema },
    },
    fallbacks: "default",
  } as Anthropic.MessageCreateParamsNonStreaming;

  let message: Anthropic.Message;
  try {
    message = await getClient().messages.create(params, {
      headers: { "anthropic-beta": "server-side-fallback-2026-07-01" },
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(
        `Claude request failed [${error.status ?? "network"}]: ${error.message.slice(0, 500)}`,
      );
      throw new FriendlyError(describeAiFailure(error.status), "");
    }
    throw error;
  }

  if (message.stop_reason === "refusal") {
    console.error("Claude declined the analysis request.");
    throw new FriendlyError(
      "The AI declined to assess this review.",
      "It has been left for a human to check.",
    );
  }
  if (message.stop_reason === "max_tokens") {
    throw new FriendlyError("The AI result came back incomplete.", "Please try again.");
  }

  const text = message.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();
  if (!text) {
    throw new FriendlyError("The AI didn't return a result for this review.", "Please try again.");
  }

  try {
    return args.validate(JSON.parse(text));
  } catch {
    console.error("Claude returned invalid structured output.");
    throw new FriendlyError("The AI result came back incomplete.", "Please try again.");
  }
}
