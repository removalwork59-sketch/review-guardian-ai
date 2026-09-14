import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(2000),
});

// Simple in-memory rate limit: max 5 messages per IP per 10 minutes.
// Serverless instances are ephemeral; this bounds casual abuse per instance.
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;
const hits = new Map<string, number[]>();

function rateLimit(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data) => contactSchema.parse(data))
  .handler(async ({ data, request }) => {
    const ip =
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";
    if (!rateLimit(ip)) {
      return { sent: false as const, reason: "rate_limited" as const };
    }

    const result = await sendTemplateEmail("contact-message", "removalwork59@gmail.com", {
      templateData: data,
      idempotencyKey: `contact-${Date.now()}-${data.email}`,
      replyTo: data.email,
    });
    return result;
  });
