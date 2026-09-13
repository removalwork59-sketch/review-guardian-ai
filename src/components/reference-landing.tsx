import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, MoonStar, Sparkles } from "lucide-react";
import { useState } from "react";

import analyticsIcon from "@/assets/reference-icons/analytics.png";
import casesIcon from "@/assets/reference-icons/cases.png";
import dashboardIcon from "@/assets/reference-icons/dashboard.png";
import locationsIcon from "@/assets/reference-icons/locations.png";
import reportsIcon from "@/assets/reference-icons/reports.png";
import reviewsIcon from "@/assets/reference-icons/reviews.png";
import scannerIcon from "@/assets/reference-icons/scanner.png";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";

const productTiles = [
  { label: "DASHBOARD", icon: dashboardIcon },
  { label: "SCANNER", icon: scannerIcon },
  { label: "CASES", icon: casesIcon },
  { label: "ANALYTICS", icon: analyticsIcon },
];

const steps = [
  { title: "Import", body: "Bring in your Google review export or paste a public review link." },
  { title: "Scan", body: "The AI scanner classifies each review and assigns a removal priority." },
  { title: "Build", body: "Open a case, collect evidence and generate the submission package." },
  { title: "Report", body: "Submit to Google, log the appeal and report outcomes to the client." },
];

const features = [
  { icon: scannerIcon, title: "AI policy violation scanner", body: "Every review is analysed against Google's published review policies — spam, fake content, off-topic, conflict of interest, harassment and more — with a confidence score and written rationale." },
  { icon: reviewsIcon, title: "Review operations at scale", body: "Import or scan reviews, filter by rating, category, priority and status, and batch-triage the queue without losing a single record." },
  { icon: casesIcon, title: "Removal case management", body: "Move cases from New through Reviewing, Evidence ready, Reported, Appeal and Resolved, with a full audit trail on every action." },
  { icon: reportsIcon, title: "Evidence packages", body: "Build a professional, submission-ready summary containing the review, business context, policy category and AI analysis." },
  { icon: analyticsIcon, title: "Reputation analytics", body: "Rating context, violation mix, negative-review tracking and per-location case status computed from live data." },
  { icon: locationsIcon, title: "Multi-location workspaces", body: "One workspace for your business, with per-location attribution for every review and case." },
];

export function ReferenceLanding({
  signedIn,
  url,
  setUrl,
  onScan,
  busy,
}: {
  signedIn: boolean;
  url: string;
  setUrl: (value: string) => void;
  onScan: (event: React.FormEvent) => void;
  busy: boolean;
}) {
  const [scannerOpen, setScannerOpen] = useState(false);

  function openScanner() {
    setScannerOpen(true);
    window.setTimeout(() => document.querySelector<HTMLInputElement>("#reference-review-url")?.focus(), 50);
  }

  return (
    <div className="reference-page">
      <header className="reference-nav">
        <div className="reference-wrap flex h-[66px] items-center justify-between">
          <Wordmark />
          <div className="flex items-center gap-2">
            <button type="button" className="reference-icon-button" aria-label="Appearance"><MoonStar className="size-4" /></button>
            <Link to={signedIn ? "/dashboard" : "/auth"} className="reference-outline-button">{signedIn ? "Dashboard" : "Sign in"}</Link>
            <Link to={signedIn ? "/dashboard" : "/auth"} className="reference-gradient-button">Start free</Link>
          </div>
        </div>
      </header>

      <div className="reference-wrap">
        <section className="reference-hero">
          <div className="reference-copy">
            <div className="reference-kicker"><Sparkles className="blink-star size-3.5" /> AI policy analysis for Google reviews</div>
            <h1>Remove policy-<br />violating reviews.<br /><span>Protect the rating<br />you earned.</span></h1>
            <p>Removal Work scans Google reviews for violations of Google's own review policies, builds evidence-backed removal cases and tracks every report and appeal to resolution — across every location you manage.</p>
            <div className="reference-actions">
              <button type="button" onClick={openScanner} className="reference-gradient-button reference-primary-action">Open the command center <ArrowRight className="size-4" /></button>
              <a href="#how" className="reference-outline-button reference-secondary-action">See how it works</a>
            </div>
            <ul className="reference-checks">
              {["Policy-aligned AI classification", "Submission-ready evidence packages", "Multi-location workspaces", "Client-ready reporting"].map((item) => <li key={item}><CheckCircle2 />{item}</li>)}
            </ul>
          </div>

          <div className="reference-console">
            <div className="reference-tile-grid">
              {productTiles.map((tile, index) => <div className="reference-product-tile" key={tile.label} style={{ animationDelay: `${index * 420}ms` }}><img src={tile.icon} alt="" /><span>{tile.label}</span></div>)}
            </div>
            <p>Every number in Removal Work comes from your live review and case data — no sample content.</p>
          </div>
        </section>

        {scannerOpen ? (
          <section id="scan" className="reference-scan-panel animate-rise">
            <div><span className="reference-kicker"><Sparkles className="size-3.5" /> Live Google review scan</span><h2>Paste a review URL</h2><p>We fetch the real business and available review text before AI checks the policy evidence.</p></div>
            <form onSubmit={onScan}>
              <input id="reference-review-url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://g.page/r/..." inputMode="url" aria-label="Google review URL" />
              <Button type="submit" disabled={busy} className="reference-gradient-button">Scan review <ArrowRight className="size-4" /></Button>
            </form>
          </section>
        ) : null}

        <section id="how" className="reference-section">
          <h2>How removal actually works</h2>
          <p className="reference-section-intro">Google decides every removal. Removal Work makes your case as strong, consistent and well-evidenced as it can possibly be — and keeps the whole pipeline auditable.</p>
          <div className="reference-steps">{steps.map((step, index) => <article key={step.title}><b>{index + 1}</b><h3>{step.title}</h3><p>{step.body}</p></article>)}</div>
        </section>

        <section className="reference-section reference-features-section">
          <h2>Built for reputation teams</h2>
          <div className="reference-features">{features.map((feature, index) => <article key={feature.title}><img src={feature.icon} alt="" style={{ animationDelay: `${index * 310}ms` }} /><h3>{feature.title}</h3><p>{feature.body}</p></article>)}</div>
        </section>

        <section className="reference-final-cta">
          <h2>Start protecting your rating today</h2>
          <p>Paste a Google Review or Business URL and run your first real AI scan in minutes.</p>
          <button type="button" onClick={openScanner} className="reference-gradient-button reference-primary-action">Start review scan <ArrowRight className="size-4" /></button>
        </section>

        <footer className="reference-footer">
          <p>© {new Date().getFullYear()} Removal Work. Reputation intelligence for multi-location brands.</p>
          <p>Removal Work is not affiliated with Google. Removal outcomes are determined solely by Google after reviewing each report.</p>
        </footer>
      </div>
    </div>
  );
}