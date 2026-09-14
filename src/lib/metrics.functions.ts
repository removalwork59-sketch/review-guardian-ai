import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type ContactMessageCount = {
  allowed: boolean;
  total: number;
  unread: number;
};

/**
 * Contact message counters for the dashboard. Non-admins get `allowed: false`
 * and zeroed counts instead of an error, so the dashboard stays usable.
 */
export const countContactMessages = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ContactMessageCount> => {
    const [admin, superadmin] = await Promise.all([
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
      context.supabase.rpc("has_role", { _user_id: context.userId, _role: "superadmin" }),
    ]);
    if (!admin.data && !superadmin.data) {
      return { allowed: false, total: 0, unread: 0 };
    }

    const [{ count: total, error: totalError }, { count: unread, error: unreadError }] =
      await Promise.all([
        context.supabase.from("contact_messages").select("id", { count: "exact", head: true }),
        context.supabase
          .from("contact_messages")
          .select("id", { count: "exact", head: true })
          .eq("status", "new"),
      ]);
    if (totalError) throw totalError;
    if (unreadError) throw unreadError;

    return { allowed: true, total: total ?? 0, unread: unread ?? 0 };
  });
