import { Link, useNavigate } from "@tanstack/react-router";
import {
  LayoutGrid,
  MapPin,
  Send,
  Upload,
  LogOut,
  Search,
  ListChecks,
  Menu,
  X,
  Mail,
  FileText,
} from "lucide-react";
import { useState } from "react";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/dashboard", label: "Reviews", icon: LayoutGrid },
  { to: "/pipeline", label: "Pipeline", icon: ListChecks },
  { to: "/reports", label: "Reports", icon: Send },
  { to: "/locations", label: "Locations", icon: MapPin },
  { to: "/bulk", label: "Bulk scan", icon: Upload },
  { to: "/messages", label: "Messages", icon: Mail },
  { to: "/blog-manager", label: "Blog", icon: FileText },
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
  const [open, setOpen] = useState(false);

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/" });
  }

  const sidebar = (
    <div className="app-sidebar-inner">
      <Link to="/" className="app-sidebar-brand" onClick={() => setOpen(false)}>
        <Wordmark />
      </Link>

      <a href="/#scan" className="app-sidebar-cta">
        <Search className="size-4" />
        New scan
      </a>

      <nav className="app-sidebar-nav" aria-label="Workspace">
        {NAV.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="app-sidebar-link"
            activeProps={{ className: "is-active" }}
            onClick={() => setOpen(false)}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="app-sidebar-footer">
        <Button
          type="button"
          variant="ghost"
          onClick={signOut}
          className="app-sidebar-signout"
        >
          <LogOut className="size-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="app-frame min-h-screen bg-background">
      {/* Mobile top bar */}
      <header className="app-mobilebar lg:hidden">
        <Link to="/">
          <Wordmark />
        </Link>
        <button
          type="button"
          className="app-mobilebar-toggle"
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      <div className="app-layout">
        {/* Desktop sidebar */}
        <aside className="app-sidebar max-lg:hidden">{sidebar}</aside>

        {/* Mobile drawer */}
        {open ? (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="app-sidebar-backdrop lg:hidden"
              onClick={() => setOpen(false)}
            />
            <aside className="app-sidebar app-sidebar-drawer lg:hidden">{sidebar}</aside>
          </>
        ) : null}

        <main className="app-main">
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
    </div>
  );
}
