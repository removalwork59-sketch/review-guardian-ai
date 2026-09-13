import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => undefined }));

const { consumeRateLimit } = await import("@/lib/rate-limit.server");

afterEach(() => {
  vi.useRealTimers();
});

describe("consumeRateLimit", () => {
  it("allows the configured number of actions, then refuses", () => {
    const key = `test-${Math.random()}`;
    expect([1, 2, 3].map(() => consumeRateLimit(key, 3, 60_000))).toEqual([true, true, true]);
    expect(consumeRateLimit(key, 3, 60_000)).toBe(false);
  });

  it("refills over time", () => {
    vi.useFakeTimers();
    const key = `refill-${Math.random()}`;
    consumeRateLimit(key, 1, 60_000);
    expect(consumeRateLimit(key, 1, 60_000)).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(consumeRateLimit(key, 1, 60_000)).toBe(true);
  });

  it("keeps separate budgets per key", () => {
    const a = `a-${Math.random()}`;
    const b = `b-${Math.random()}`;
    consumeRateLimit(a, 1, 60_000);
    expect(consumeRateLimit(a, 1, 60_000)).toBe(false);
    expect(consumeRateLimit(b, 1, 60_000)).toBe(true);
  });
});
