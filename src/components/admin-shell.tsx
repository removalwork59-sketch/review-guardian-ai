import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";

import { Wordmark } from "@/components/brand";

const TABS = [
  { to: "/admin", label: "System" },
  { to: "/admin/jobs", label: "Jobs" },
  { to: "/admin/users", label: "Users & workspaces" },
  { to: "/admin/ai", label: "AI runs" },
  { to: "/admin/audit", label: "Audit log" },
] as const;

/** Super admin frame, deliberately separate from the client workspace. */
export function AdminShell({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="rounded-full border border-warning/30 bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning">
              Super admin
            </span>
          </div>
          <Link
            to="/app/reviews"
            className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" /> Back to workspace
          </Link>
        </div>
        <nav
          className="mx-auto flex max-w-[1440px] gap-1 overflow-x-auto px-3 pb-2 sm:px-5"
          aria-label="Super admin"
        >
          {TABS.map((tab) => (
            <Link
              key={tab.to}
              to={tab.to}
              activeOptions={{ exact: true }}
              className="inline-flex min-h-10 shrink-0 items-center rounded-lg px-3 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-ink"
              activeProps={{ className: "bg-info-soft text-ink" }}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>
      <main id="main-content" className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="shell-title">{title}</h1>
            {description ? <p className="shell-description">{description}</p> : null}
          </div>
          {actions}
        </div>
        {children}
      </main>
    </div>
  );
}
