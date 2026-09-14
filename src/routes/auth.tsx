import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Bot, CheckCircle2, FileCheck2, ScanSearch, Sparkles } from "lucide-react";

import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { isSchemaMissing, MIGRATION_BLOCKER } from "@/lib/errors";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Removal Work" },
      {
        name: "description",
        content: "Sign in to keep your review cases, reports and locations in one place.",
      },
      { property: "og:title", content: "Sign in — Removal Work" },
      {
        property: "og:description",
        content: "Sign in to keep your review cases, reports and locations in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "error" | "ok"; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) void navigate({ to: "/app/reviews" });
    });
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/app/reviews` },
      });
      setBusy(false);
      if (error) return setMessage({ tone: "error", text: error.message });
      if (!data.session) {
        return setMessage({
          tone: "ok",
          text: "Check your inbox and click the link to finish creating your account.",
        });
      }
      await supabase.rpc("ensure_my_profile");
      void navigate({ to: "/app/reviews" });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setBusy(false);
      return setMessage({ tone: "error", text: error.message });
    }
    const { error: profileError } = await supabase.rpc("ensure_my_profile");
    setBusy(false);
    if (profileError) {
      return setMessage({
        tone: "error",
        text: isSchemaMissing(profileError)
          ? `You're signed in, but the workspace can't open: ${MIGRATION_BLOCKER}`
          : `You're signed in, but your profile couldn't be prepared (database error ${profileError.code ?? "unknown"}).`,
      });
    }
    void navigate({ to: "/app/reviews" });
  }

  async function handleGoogle() {
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/app/reviews` },
    });
    if (error) {
      setMessage({ tone: "error", text: "Google sign-in didn't complete. Please try again." });
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-story" aria-label="Removal Work product workflow">
          <Link to="/" className="auth-brand">
            <Wordmark />
          </Link>
          <div className="auth-story-copy">
            <span className="auth-kicker">
              <Sparkles /> AI review intelligence
            </span>
            <h1>Turn review policy into clear action.</h1>
            <p>
              Scan the real review, understand the evidence, prepare the report and track the
              outcome.
            </p>
          </div>
          <div className="auth-slider" aria-hidden="true">
            <article className="auth-slide auth-slide-scan">
              <span>
                <ScanSearch />
              </span>
              <div>
                <b>Review detected</b>
                <small>Reading source and business context</small>
              </div>
              <i className="auth-scan-beam" />
            </article>
            <article className="auth-slide auth-slide-policy">
              <span>
                <Bot />
              </span>
              <div>
                <b>Policy evidence</b>
                <small>AI weighs evidence and counter-evidence</small>
              </div>
              <em>Analyzing</em>
            </article>
            <article className="auth-slide auth-slide-report">
              <span>
                <FileCheck2 />
              </span>
              <div>
                <b>Case ready</b>
                <small>Legitimate action with honest status</small>
              </div>
              <CheckCircle2 />
            </article>
          </div>
          <p className="auth-story-note">Real scans. Real AI analysis. No guaranteed removals.</p>
        </section>

        <section className="auth-form-side">
          <Link to="/" className="auth-mobile-brand">
            <Wordmark />
          </Link>
          <div className="auth-form-card">
            <span className="auth-form-light" aria-hidden="true" />
            <div className="auth-form-heading">
              <span>{mode === "signin" ? "Secure workspace access" : "Create your workspace"}</span>
              <h2>{mode === "signin" ? "Welcome back" : "Create your account"}</h2>
              <p>Your scans, reports and locations stay together.</p>
            </div>

            <Button type="button" variant="outline" onClick={handleGoogle} className="auth-google">
              <span className="auth-google-g">G</span> Continue with Google
            </Button>

            <div className="auth-divider">
              <span />
              or use email
              <span />
            </div>

            <form onSubmit={handleSubmit} className="auth-fields">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
              />
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
              />
              <Button type="submit" disabled={busy} className="auth-submit">
                {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                <ArrowRight />
              </Button>
            </form>

            {message ? (
              <p
                role="status"
                className={`auth-message ${message.tone === "error" ? "is-error" : "is-ok"}`}
              >
                {message.text}
              </p>
            ) : null}

            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setMode(mode === "signin" ? "signup" : "signin");
                setMessage(null);
              }}
              className="auth-mode"
            >
              {mode === "signin"
                ? "New here? Create an account"
                : "Already have an account? Sign in"}
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
