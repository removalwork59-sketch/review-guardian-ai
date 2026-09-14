import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { CaseStatus } from "./case-types";

export type PublicCaseStatus = {
  id: string;
  slug: string;
  platform: string;
  headline: string;
  status: CaseStatus;
  verdict: string;
  confidence: number;
  severity: string;
  reportedAt: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Progress a visitor can honestly see, based only on owner-confirmed states. */
export const PUBLIC_PROGRESS: Record<CaseStatus, { step: number; label: string }> = {
  new: { step: 1, label: "Prepared — not submitted" },
  ignored: { step: 1, label: "Left alone by the owner" },
  reported: { step: 2, label: "Owner marked it submitted to the platform" },
  pending: { step: 3, label: "Awaiting the platform's outcome" },
  removed: { step: 4, label: "Owner confirmed the review was removed" },
  rejected: { step: 4, label: "Owner confirmed the platform kept the review" },
};

export const PUBLIC_PROGRESS_STEPS = 4;

/** Public, read-only status feed. No review text, author, or business data. */
export const listPublicCaseStatuses = createServerFn({ method: "GET" }).handler(
  async (): Promise<PublicCaseStatus[]> => {
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const supabasePublic = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
            headers.delete("Authorization");
          }
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
    });

    const { data, error } = await supabasePublic
      .from("review_cases")
      .select(
        "id, public_slug, platform, headline, status, verdict, confidence, severity, reported_at, resolved_at, created_at, updated_at",
      )
      .eq("public_status", true)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      id: row.id,
      slug: row.public_slug ?? row.id,
      platform: row.platform,
      headline: row.headline,
      status: row.status as CaseStatus,
      verdict: row.verdict,
      confidence: row.confidence,
      severity: row.severity,
      reportedAt: row.reported_at,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },
);

/** Owner opt-in: publish or unpublish a case's status on the public page. */
export const setCasePublicStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid(), isPublic: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("review_cases")
      .update({
        public_status: data.isPublic,
        ...(data.isPublic ? { public_slug: data.id } : {}),
      })
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true as const, isPublic: data.isPublic };
  });
