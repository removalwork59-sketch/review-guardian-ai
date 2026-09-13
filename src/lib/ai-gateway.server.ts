import { createOpenAI } from "@ai-sdk/openai";

const LOVABLE_AIG_RUN_ID_HEADER = "X-Lovable-AIG-Run-ID";

export function createLovableAiGatewayRunIdFetch(initialRunId?: string) {
  let runId = initialRunId?.trim() || undefined;

  return {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (runId && !headers.has(LOVABLE_AIG_RUN_ID_HEADER)) {
        headers.set(LOVABLE_AIG_RUN_ID_HEADER, runId);
      }
      const response = await fetch(input, { ...init, headers });
      const next = response.headers.get(LOVABLE_AIG_RUN_ID_HEADER)?.trim();
      if (!runId && next) runId = next;
      return response;
    },
  };
}

/** Responses-API provider for OpenAI models served by the Lovable AI Gateway. */
export function createReasoningModel() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) {
    throw new Error("Missing LOVABLE_API_KEY");
  }

  const runIdFetch = createLovableAiGatewayRunIdFetch();

  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: {
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
    fetch: runIdFetch.fetch,
  });

  return provider.responses("openai/gpt-6-astra");
}

export const REASONING_PROVIDER_OPTIONS = {
  openai: {
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    store: false,
  },
} as const;

export function describeAiFailure(status?: number) {
  if (status === 402) {
    return "The AI checks are paused because this workspace is out of AI credits.";
  }
  if (status === 403) {
    return "AI checks are currently turned off for this workspace.";
  }
  if (status === 429) {
    return "The AI is busy right now. Please try again in a minute.";
  }
  return "The AI couldn't finish checking this review. Please try again.";
}
