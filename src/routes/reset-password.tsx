import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, KeyRound } from "lucide-react";

import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Reset password — Removal Work" },
      { name: "description", content: "Securely choose a new password for your Removal Work account." },
      { property: "og:title", content: "Reset password — Removal Work" },
      { property: "og:description", content: "Securely choose a new password for your Removal Work account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setReady(Boolean(data.session));
      if (!data.session) {
        setMessage({ tone: "error", text: "This reset link is invalid or has expired. Request a new one from the sign-in page." });
      }
    }).catch(() => {
      if (active) setMessage({ tone: "error", text: "The reset link could not be verified. Request a new one." });
    });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !ready) return;
    setMessage(null);
    if (password.length < 8) {
      setMessage({ tone: "error", text: "Use at least 8 characters for your new password." });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ tone: "error", text: "The passwords do not match." });
      return;
    }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      setMessage({ tone: "error", text: "The password could not be updated. Request a fresh reset link and try again." });
      return;
    }
    setMessage({ tone: "ok", text: "Password updated. Opening your dashboard…" });
    window.setTimeout(() => void navigate({ to: "/dashboard", replace: true }), 600);
  }

  return (
    <main className="auth-page">
      <div className="auth-shell auth-reset-shell">
        <section className="auth-form-side">
          <Link to="/" className="auth-mobile-brand"><Wordmark /></Link>
          <div className="auth-form-card">
            <span className="auth-form-light" aria-hidden="true" />
            <div className="auth-form-heading">
              <span>Secure account recovery</span>
              <h1>Choose a new password</h1>
              <p>Set a strong password to restore access to your workspace.</p>
            </div>
            <form className="auth-fields" onSubmit={submit}>
              <label htmlFor="new-password">New password</label>
              <input id="new-password" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} disabled={busy || !ready} />
              <label htmlFor="confirm-password">Confirm new password</label>
              <input id="confirm-password" type="password" minLength={8} required autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={busy || !ready} />
              <Button type="submit" className="auth-submit" disabled={busy || !ready}>
                {busy ? "Updating…" : "Update password"} <KeyRound className="size-4" />
              </Button>
            </form>
            {message ? <p role="status" className={`auth-message ${message.tone === "error" ? "is-error" : "is-ok"}`}>{message.text}</p> : null}
            <Button type="button" variant="ghost" className="auth-mode" onClick={() => void navigate({ to: "/auth" })}>
              Back to sign in <ArrowRight className="size-4" />
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}