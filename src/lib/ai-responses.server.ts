import { describeAiFailure } from "./ai-gateway.server";
import { FriendlyError } from "./google.server";

const RESPONSES_URL = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-6-astra";

type JsonSchema = Record<string, unknown>;

/**
 * Calls the Lovable AI Gateway Responses API with a strict JSON schema.
 * Streaming is required for reasoning models; we consume the stream server-side
 * and return the final parsed object.
 */
export async function generateStrictJson<T>(args: {
  instructions: string;
  input: string;
  schemaName: string;
  schema: JsonSchema;
}): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new FriendlyError("The AI service isn't configured yet.", "");
  }

  const response = await fetch(RESPONSES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      reasoning: { effort: "low", summary: "auto" },
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

  if (!response.ok || !response.body) {
    const body = await response.text().catch(() => "");
    console.error(`AI gateway failed [${response.status}]: ${body}`);
    throw new FriendlyError(describeAiFailure(response.status), "");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";

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
            response?: { output_text?: string };
          };
          if (event.type === "response.output_text.delta" && typeof event.delta === "string") {
            text += event.delta;
          }
          if (event.type === "response.completed" && event.response?.output_text) {
            text = event.response.output_text;
          }
        } catch {
          // ignore keep-alive / partial frames
        }
      }
    }
  }

  if (!text.trim()) {
    throw new FriendlyError("The AI didn't return a result for this review.", "Please try again.");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    console.error("AI returned unparsable JSON:", text.slice(0, 500));
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
