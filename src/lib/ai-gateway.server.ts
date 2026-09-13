/** Provider-neutral AI failure wording shared by the OpenAI and Claude clients. */
export function describeAiFailure(status?: number) {
  if (status === 401) {
    return "The AI service rejected the server's credentials.";
  }
  if (status === 402) {
    return "The AI checks are paused because the AI account is out of credits.";
  }
  if (status === 403) {
    return "AI checks are currently turned off for this account.";
  }
  if (status === 404) {
    return "The configured AI model isn't available to this account.";
  }
  if (status === 429) {
    return "The AI is busy right now. Please try again in a minute.";
  }
  return "The AI couldn't finish checking this review. Please try again.";
}

export function isRetryableStatus(status: number) {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}
