import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, MapPin, Send, Upload, LogOut, Search } from "lucide-react";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Reviews", icon: LayoutGrid },
  { to: "/reports", label: "Reports", icon: Send },
  { to: "/locations", label: "Locations", icon: MapPin },
  { to: "/bulk", label: "Bulk scan", icon: Upload },
] as const;

export function AppShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link to="/">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-sm font-medium text-ink transition hover:bg-muted"
            >
              <Search className="size-4" />
              New scan
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:text-ink"
            >
              <LogOut className="size-4" />
              Sign out
            </button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted hover:text-ink"
              activeProps={{ className: "bg-info-soft text-primary hover:bg-info-soft" }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl px-5 pb-24 pt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-semibold text-ink">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          {actions}
        </div>
        <div className="mt-7">{children}</div>
      </main>
    </div>
  );
}
