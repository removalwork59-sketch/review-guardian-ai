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
  validate: (value: unknown) => T;
}): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new FriendlyError("The AI service isn't configured yet.", "");
  }

  let response: Response | undefined;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    response = await fetch(RESPONSES_URL, {
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

    if (response.ok || (response.status !== 429 && response.status < 500)) break;
    if (attempt === 2) break;
    const retryAfter = Number(response.headers.get("Retry-After"));
    const fallbackDelay = 750 * 2 ** attempt + Math.floor(Math.random() * 250);
    const delay = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : fallbackDelay;
    await response.body?.cancel().catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  if (!response || !response.ok || !response.body) {
    if (!response) throw new FriendlyError("The AI service could not be reached.", "Please try again.");
    const body = await response.text().catch(() => "");
    console.error(`AI gateway failed [${response.status}]: ${body}`);
    let gatewayMessage = "";
    try {
      const parsed = JSON.parse(body) as { message?: string; error?: { message?: string } };
      gatewayMessage = parsed.message ?? parsed.error?.message ?? "";
    } catch {
      gatewayMessage = "";
    }
    throw new FriendlyError(gatewayMessage || describeAiFailure(response.status), "");
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
    return args.validate(JSON.parse(text));
  } catch {
    console.error("AI returned invalid structured output.");
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
