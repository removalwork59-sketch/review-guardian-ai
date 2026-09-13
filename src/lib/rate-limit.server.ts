import { getRequest } from "@tanstack/react-start/server";

type Bucket = { tokens: number; updatedAt: number };

const buckets = new Map<string, Bucket>();
const MAX_BUCKETS = 20_000;

/** Client address as seen by nginx (which sets X-Real-IP); never trusts arbitrary client headers first. */
export function clientAddress() {
  const headers = getRequest()?.headers;
  return (
    headers?.get("x-real-ip") ?? headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

/**
 * Token bucket: `capacity` actions per `windowMs`, refilled continuously. Returns false when the
 * caller is over the limit. In-process, which matches the single production app instance.
 */
export function consumeRateLimit(key: string, capacity: number, windowMs: number) {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { tokens: capacity, updatedAt: now };
  bucket.tokens = Math.min(
    capacity,
    bucket.tokens + ((now - bucket.updatedAt) * capacity) / windowMs,
  );
  bucket.updatedAt = now;

  const allowed = bucket.tokens >= 1;
  if (allowed) bucket.tokens -= 1;
  buckets.delete(key);
  buckets.set(key, bucket);

  if (buckets.size > MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest !== undefined) buckets.delete(oldest);
  }
  return allowed;
}
