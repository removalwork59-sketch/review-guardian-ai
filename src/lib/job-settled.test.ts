import { describe, expect, it } from "vitest";

import { isJobSettled } from "@/lib/state-machines";

const job = (
  status: string,
  errorCode: string | null = null,
  attemptCount = 1,
  maxAttempts = 5,
) => ({
  status,
  errorCode,
  attemptCount,
  maxAttempts,
});

describe("isJobSettled", () => {
  it("treats finished jobs as settled", () => {
    for (const status of ["completed", "report_ready", "needs_human_review", "cancelled"]) {
      expect(isJobSettled(job(status))).toBe(true);
    }
  });

  it("keeps queued and in-flight jobs unsettled", () => {
    for (const status of ["queued", "discovering", "analyzing", "awaiting_selection"]) {
      expect(isJobSettled(job(status))).toBe(false);
    }
  });

  it("settles failures the worker will not retry, even with attempts left", () => {
    expect(isJobSettled(job("failed", "review_text_unavailable", 1, 5))).toBe(true);
    expect(isJobSettled(job("failed", null, 1, 5))).toBe(true);
  });

  it("keeps retryable failures unsettled until attempts run out", () => {
    expect(isJobSettled(job("failed", "rate_limited", 2, 5))).toBe(false);
    expect(isJobSettled(job("failed", "rate_limited", 5, 5))).toBe(true);
  });
});
