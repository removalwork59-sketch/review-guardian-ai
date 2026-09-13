import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Wordmark } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Review Shield" },
      {
        name: "description",
        content: "Sign in to keep your review cases, reports and locations in one place.",
      },
      { property: "og:title", content: "Sign in — Review Shield" },
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
      if (data.session) void navigate({ to: "/dashboard" });
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
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      });
      setBusy(false);
      if (error) return setMessage({ tone: "error", text: error.message });
      if (!data.session) {
        return setMessage({
          tone: "ok",
          text: "Check your inbox and click the link to finish creating your account.",
        });
      }
      void navigate({ to: "/dashboard" });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setMessage({ tone: "error", text: error.message });
    void navigate({ to: "/dashboard" });
  }

  async function handleGoogle() {
    setMessage(null);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMessage({ tone: "error", text: "Google sign-in didn't complete. Please try again." });
      return;
    }
    if (result.redirected) return;
    void navigate({ to: "/dashboard" });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-5 py-12">
      <Link to="/">
        <Wordmark />
      </Link>

      <div className="surface mt-8 w-full max-w-md p-7">
        <h1 className="font-display text-2xl font-semibold text-ink">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your scans, reports and locations stay saved here.
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          className="mt-6 w-full rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-ink transition hover:bg-muted"
        >
          Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or use email
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="text-sm font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </div>
          <div>
            <label htmlFor="password" className="text-sm font-medium text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:brightness-110 disabled:opacity-60"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        {message ? (
          <p
            className={`mt-4 rounded-xl px-3 py-2 text-sm ${
              message.tone === "error"
                ? "bg-danger-soft text-danger"
                : "bg-safe-soft text-safe"
            }`}
          >
            {message.text}
          </p>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMessage(null);
          }}
          className="mt-5 w-full text-sm text-muted-foreground transition hover:text-ink"
        >
          {mode === "signin"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
      </div>
    </main>
  );
}
