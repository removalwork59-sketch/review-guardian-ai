import { Link, useNavigate } from "@tanstack/react-router";
import {
  FileText,
  LayoutGrid,
  LogOut,
  MapPin,
  Plus,
  PlugZap,
  Settings,
  ShieldCheck,
  Upload,
} from "lucide-react";
import type { ReactNode } from "react";

import { BrandMark, Wordmark } from "@/components/brand";
import { supabase } from "@/integrations/supabase/client";

const NAV = [
  { to: "/app/reviews", label: "Reviews", icon: LayoutGrid },
  { to: "/app/reports", label: "Reports", icon: FileText },
  { to: "/app/locations", label: "Locations", icon: MapPin },
  { to: "/app/platforms", label: "Platforms", icon: PlugZap },
  { to: "/app/bulk", label: "Bulk scan", icon: Upload },
  { to: "/app/settings", label: "Settings", icon: Settings },
] as const;

const MOBILE_NAV = [
  { to: "/app/reviews", label: "Reviews", icon: LayoutGrid },
  { to: "/app/reports", label: "Reports", icon: FileText },
  { to: "/app/locations", label: "Places", icon: MapPin },
  { to: "/app/settings", label: "More", icon: Settings },
] as const;

/**
 * One responsive workspace frame:
 * desktop (≥1024px) full sidebar · tablet (768–1023px) icon rail · mobile top bar + bottom nav.
 * Add review is always one tap away.
 */
export function AppShell({
  title,
  description,
  actions,
  children,
  admin = false,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
  admin?: boolean;
}) {
  const navigate = useNavigate();

  async function signOut() {
    await supabase.auth.signOut();
    await navigate({ to: "/" });
  }

  return (
    <div className="shell">
      <a href="#main-content" className="shell-skip">
        Skip to content
      </a>

      <aside className="shell-sidebar" aria-label="Workspace navigation">
        <Link to="/app/reviews" className="shell-brand" aria-label="Removal Work home">
          <span className="shell-brand-full">
            <Wordmark />
          </span>
          <span className="shell-brand-mark">
            <BrandMark className="size-9" />
          </span>
        </Link>
        <Link to="/app/reviews/new" className="shell-add cta-glow" title="Add review">
          <Plus className="size-5" aria-hidden="true" />
          <span className="shell-label">Add review</span>
        </Link>
        <nav className="shell-nav">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="shell-nav-link"
              activeProps={{ className: "is-active" }}
              title={item.label}
            >
              <item.icon className="size-[18px] shrink-0" aria-hidden="true" />
              <span className="shell-label">{item.label}</span>
            </Link>
          ))}
          {admin ? (
            <Link
              to="/admin"
              className="shell-nav-link"
              activeProps={{ className: "is-active" }}
              title="Super admin"
            >
              <ShieldCheck className="size-[18px] shrink-0" aria-hidden="true" />
              <span className="shell-label">Super admin</span>
            </Link>
          ) : null}
        </nav>
        <button type="button" onClick={signOut} className="shell-signout" title="Sign out">
          <LogOut className="size-[18px]" aria-hidden="true" />
          <span className="shell-label">Sign out</span>
        </button>
      </aside>

      <header className="shell-topbar">
        <Link to="/app/reviews" aria-label="Removal Work home">
          <Wordmark />
        </Link>
        <Link to="/app/reviews/new" className="shell-topbar-add cta-glow">
          <Plus className="size-4" aria-hidden="true" />
          Add review
        </Link>
      </header>

      <main id="main-content" className="shell-main" tabIndex={-1}>
        <div className="shell-heading">
          <div className="min-w-0">
            <h1 className="shell-title">{title}</h1>
            {description ? <p className="shell-description">{description}</p> : null}
          </div>
          {actions ? <div className="shell-actions">{actions}</div> : null}
        </div>
        {children}
      </main>

      <nav className="shell-bottom-nav" aria-label="Primary">
        {MOBILE_NAV.slice(0, 2).map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="shell-bottom-link"
            activeProps={{ className: "is-active" }}
          >
            <item.icon className="size-5" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
        <Link to="/app/reviews/new" className="shell-bottom-add cta-glow" aria-label="Add review">
          <Plus className="size-6" aria-hidden="true" />
        </Link>
        {MOBILE_NAV.slice(2).map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className="shell-bottom-link"
            activeProps={{ className: "is-active" }}
          >
            <item.icon className="size-5" aria-hidden="true" />
            {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
