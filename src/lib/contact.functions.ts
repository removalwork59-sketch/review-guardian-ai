import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(120),
  subject: z.string().trim().min(3).max(120),
  message: z.string().trim().min(10).max(2000),
});

export type ContactMessage = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  emailStatus: string;
  status: string;
  handledNote: string;
  createdAt: string;
};

const MESSAGE_STATUSES = ["new", "read", "replied", "archived"] as const;

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

function toMessage(row: any): ContactMessage {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    emailStatus: row.email_status,
    status: row.status,
    handledNote: row.handled_note ?? "",
    createdAt: row.created_at,
  };
}

async function assertAdmin(context: { supabase: any; userId: string }) {
  const [admin, superadmin] = await Promise.all([
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "superadmin" }),
  ]);
  if (!admin.data && !superadmin.data) throw new Error("Forbidden");
}

export const sendContactMessage = createServerFn({ method: "POST" })
  .inputValidator((data) => contactSchema.parse(data))
  .handler(async ({ data }) => {
    const headers = getRequestHeaders();
    const ip =
      headers.get("cf-connecting-ip") ??
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "anonymous";
    if (!rateLimit(ip)) {
      return { sent: false as const, reason: "rate_limited" as const };
    }

    const result = await sendTemplateEmail("contact-message", "removalwork59@gmail.com", {
      templateData: data,
      idempotencyKey: `contact-${Date.now()}-${data.email}`,
      replyTo: data.email,
    });

    // Store the submission so it is readable in the dashboard even if delivery fails.
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("contact_messages").insert({
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        email_status: result.sent ? "sent" : (result as { reason?: string }).reason ?? "failed",
        source_ip: ip,
      });
    } catch (error) {
      console.error("contact_messages insert failed", error);
    }

    return result;
  });

export const listContactMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContactMessage[]> => {
    await assertAdmin(context as any);
    const { data, error } = await context.supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return (data ?? []).map(toMessage);
  });

export const updateContactMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(MESSAGE_STATUSES).optional(),
        note: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ContactMessage> => {
    await assertAdmin(context as any);
    const { data: row, error } = await context.supabase
      .from("contact_messages")
      .update({
        ...(data.status ? { status: data.status } : {}),
        ...(data.note !== undefined ? { handled_note: data.note } : {}),
      })
      .eq("id", data.id)
      .select("*")
      .single();
    if (error) throw error;
    return toMessage(row);
  });

export const deleteContactMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context as any);
    const { error } = await context.supabase.from("contact_messages").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true as const };
  });
