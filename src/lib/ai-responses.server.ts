import { describeAiFailure, isRetryableStatus } from "./ai-gateway.server";
import { FriendlyError } from "./google.server";

const RESPONSES_URL = "https://api.openai.com/v1/responses";

type JsonSchema = Record<string, unknown>;

export function openAiModel() {
  return process.env["OPENAI_MODEL"] || "gpt-6-astra";
}

export function hasOpenAi() {
  return Boolean(process.env["OPENAI_API_KEY"]);
}

/**
 * Calls the OpenAI Responses API directly with a strict JSON schema.
 * The stream is consumed server-side and the final parsed object is returned.
 */
export async function generateStrictJson<T>(args: {
  instructions: string;
  input: string;
  schemaName: string;
  schema: JsonSchema;
  validate: (value: unknown) => T;
  effort?: "low" | "medium" | "high";
}): Promise<T> {
  const apiKey = process.env["OPENAI_API_KEY"];
  if (!apiKey) {
    throw new FriendlyError("The AI service isn't configured yet.", "");
  }

  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      response = await fetch(RESPONSES_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({
          model: openAiModel(),
          stream: true,
          store: false,
          reasoning: { effort: args.effort ?? "low" },
          instructions: args.instructions,
          input: args.input,
          text: {
            format: {
              type: "json_schema",
              name: args.schemaName,
              strict: true,
              schema: args.schema,
            },
          },
        }),
      });
    } catch (error) {
      console.error("OpenAI request failed before a response.", error);
      response = undefined;
      if (attempt === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 750 * 2 ** attempt));
      continue;
    }

    if (response.ok || !isRetryableStatus(response.status)) break;
    if (attempt === 2) break;
    const retryAfter = Number(response.headers.get("Retry-After"));
    const fallbackDelay = 750 * 2 ** attempt + Math.floor(Math.random() * 250);
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : fallbackDelay;
    await response.body?.cancel().catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  if (!response || !response.ok || !response.body) {
    if (!response)
      throw new FriendlyError("The AI service could not be reached.", "Please try again.");
    const body = await response.text().catch(() => "");
    console.error(`OpenAI request failed [${response.status}]: ${body.slice(0, 500)}`);
    throw new FriendlyError(describeAiFailure(response.status), "");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let failure = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      for (const line of chunk.split("\n")) {
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const event = JSON.parse(payload) as {
            type?: string;
            delta?: string;
            error?: { message?: string };
            response?: { error?: { message?: string } | null };
          };
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            text += event.delta;
          }
          if (event.type === "response.failed" || event.type === "error") {
            failure = event.response?.error?.message ?? event.error?.message ?? "response failed";
          }
        } catch {
          // ignore keep-alive / partial frames
        }
      }
    }
  }

  if (failure) {
    console.error(`OpenAI response failed: ${failure}`);
    throw new FriendlyError(describeAiFailure(), "");
  }
  if (!text.trim()) {
    throw new FriendlyError("The AI didn't return a result for this review.", "Please try again.");
  }

  try {
    return args.validate(JSON.parse(text));
  } catch {
    console.error("OpenAI returned invalid structured output.");
    throw new FriendlyError("The AI result came back incomplete.", "Please try again.");
  }
}

export function strictObject(properties: Record<string, JsonSchema>): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    required: Object.keys(properties),
    properties,
  };
}
