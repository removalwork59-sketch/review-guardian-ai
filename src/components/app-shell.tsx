import { Link, useNavigate } from "@tanstack/react-router";
import { LayoutGrid, MapPin, Send, Upload, LogOut, Search } from "lucide-react";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
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
    <div className="app-frame min-h-screen bg-background">
      <header className="app-header">
        <div className="app-container grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-4 sm:flex sm:justify-between">
          <Link to="/" className="min-w-0">
            <Wordmark />
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/"
              aria-label="Start a new review scan"
              className="app-secondary-action"
            >
              <Search className="size-4" />
              New scan
            </Link>
            <Button
              type="button"
              variant="ghost"
              onClick={signOut}
              className="app-signout"
            >
              <LogOut className="size-4" />
              Sign out
            </Button>
          </div>
        </div>
        <nav className="app-container app-nav" aria-label="Workspace">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="app-nav-link"
              activeProps={{ className: "bg-info-soft text-ink hover:bg-info-soft" }}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="app-container app-main">
        <div className="app-page-heading">
          <div className="min-w-0">
            <h1 className="app-page-title">{title}</h1>
            <p className="app-page-description">{description}</p>
          </div>
          {actions ? <div className="shrink-0">{actions}</div> : null}
        </div>
        <div className="app-page-content">{children}</div>
      </main>
    </div>
  );
}
