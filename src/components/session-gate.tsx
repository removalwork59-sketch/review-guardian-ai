import { useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import { supabase } from "@/integrations/supabase/client";

/**
 * Renders signed-in areas only once the browser has a Supabase session, otherwise sends the
 * visitor to /auth. The check runs after hydration: redirecting from beforeLoad swapped the
 * server-rendered /auth page in mid-hydration and React threw a hydration mismatch (#418).
 * This is navigation only; every server function re-checks the session itself.
 */
export function SessionGate({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    let active = true;
    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (!active) return;
      if (error || !data.user) {
        // Drop a stored session the auth server no longer accepts, so /auth shows the form.
        await supabase.auth.signOut({ scope: "local" });
        void navigate({ to: "/auth", replace: true });
      } else {
        setSignedIn(true);
      }
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  return signedIn ? <>{children}</> : null;
}
