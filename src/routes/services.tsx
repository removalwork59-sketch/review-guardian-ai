import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ClipboardList, FileText, Radar, TrendingUp } from "lucide-react";

import { Wordmark } from "@/components/brand";

export const Route = createFileRoute("/services")({
  head: () => ({
    meta: [
      { title: "Services — Review Scanning, Evidence & Tracking | Removal Work" },
      {
        name: "description",
        content:
          "Removal Work services: AI review policy scanning for Google reviews, evidence-based report preparation, and honest case and outcome tracking.",
      },
      { property: "og:title", content: "Services — Review Scanning, Evidence & Tracking | Removal Work" },
      {
        property: "og:description",
        content:
          "AI review policy scanning, evidence-based report preparation, and honest outcome tracking.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/services" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "canonical", href: "/services" }],
  }),
  component: ServicesPage,
});

const SERVICES = [
  {
    icon: Radar,
    title: "Review policy scanning",
    status: "Live for Google reviews",
    body: "Paste a Google review link. We find the real business, read the review, and check it against Google's written policy categories — fake engagement, spam, conflict of interest, harassment, and more.",
  },
  {
    icon: FileText,
    title: "Evidence & report preparation",
    status: "Live",
    body: "When a real violation is found, the AI prepares a structured report with the policy category, supporting evidence, and counter-evidence — so you submit facts, not frustration. If the review doesn't break the rules, we tell you plainly.",
  },
  {
    icon: ClipboardList,
    title: "Case pipeline",
    status: "Live",
    body: "Every scanned review becomes a tracked case: pending, identified, reported, or resolved. Filter by category and business, and run bulk scans across many links with per-link status.",
  },
  {
    icon: TrendingUp,
    title: "Honest outcome tracking",
    status: "Live",
    body: "Google provides no API for report status, so no tool can automate this. You record the real outcome — removed, kept, or pending — and your Reports page always reflects what actually happened.",
  },
];

function ServicesPage() {
  return (
    <div className="page-shell">
      <header className="page-header">
        <Link to="/" aria-label="Removal Work home">
          <Wordmark />
        </Link>
        <Link to="/" className="page-back">
          <ArrowLeft className="size-4" /> Home
        </Link>
      </header>
      <main className="page-main">
        <p className="page-eyebrow">Services</p>
        <h1 className="page-title">What Removal Work does</h1>
        <p className="page-lede">
          Policy-led review intelligence: we only prepare a report when a review genuinely breaks the rules —
          and we say so when it doesn&apos;t.
        </p>
        <div className="services-grid">
          {SERVICES.map((s) => (
            <article key={s.title} className="service-card">
              <s.icon className="size-6 service-icon" aria-hidden="true" />
              <span className="service-status">{s.status}</span>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
        <div className="page-cta">
          <p>Google review scanning is live now. Other platform connections are planned.</p>
          <Link to="/" className="page-cta-button">
            Scan a review free
          </Link>
        </div>
      </main>
      <footer className="page-footer">
        <p>© {new Date().getFullYear()} Removal Work. Not affiliated with Google.</p>
      </footer>
    </div>
  );
}
