import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2, ChevronDown, MoonStar, Sparkles, Sun, X } from "lucide-react";
import { useState } from "react";

import analyticsIcon from "@/assets/reference-icons/analytics.png";
import casesIcon from "@/assets/reference-icons/cases.png";
import locationsIcon from "@/assets/reference-icons/locations.png";
import reportsIcon from "@/assets/reference-icons/reports.png";
import reviewsIcon from "@/assets/reference-icons/reviews.png";
import scannerIcon from "@/assets/reference-icons/scanner.png";
import { Wordmark } from "@/components/brand";
import { Button } from "@/components/ui/button";



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
  const [lightMode, setLightMode] = useState(false);
  const [chatOpen, setChatOpen] = useState(true);

  function openScanner() {
    setScannerOpen(true);
    window.setTimeout(() => document.querySelector<HTMLInputElement>("#reference-review-url")?.focus(), 50);
  }

  return (
    <div className={`reference-page ${lightMode ? "reference-light" : ""}`}>
      <header className="reference-nav">
        <div className="reference-wrap flex items-center justify-between gap-6">
          <Wordmark />
          <nav className="reference-navlinks">
            <a href="#how">Review Removal <ChevronDown /></a>
            <a href="#features">Brand Protection <ChevronDown /></a>
            <a href="#scan">Resources <ChevronDown /></a>
          </nav>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => setLightMode((value) => !value)} className="reference-icon-button" aria-label="Toggle appearance">{lightMode ? <Sun className="size-4" /> : <MoonStar className="size-4" />}</button>
            <Link to={signedIn ? "/dashboard" : "/auth"} className="reference-outline-button">{signedIn ? "Dashboard" : "Client Login"}</Link>
            <a href="#how" className="reference-outline-button">Book a Call</a>
            <button type="button" onClick={openScanner} className="reference-gradient-button">Get a Free Review Audit <span className="arrow-dot"><ArrowRight className="size-3.5" /></span></button>
          </div>
        </div>
      </header>

      <div className="reference-wrap">
        <section className="reference-hero">
          <div className="reference-copy">
            <h1>Report Only<br />What Breaks The Rules</h1>
            <p>Checked against Google, Facebook, Yelp and 20+ more platform policies.<br />No policy violation, no report. It&apos;s that simple.</p>
            <div className="reference-actions">
              <button type="button" onClick={openScanner} className="reference-gradient-button reference-primary-action">Get Your Free Review Audit <span className="arrow-dot"><ArrowRight className="size-3.5" /></span></button>
              <a href="#how" className="reference-outline-button reference-secondary-action">Book a Call <ArrowRight className="size-4" /></a>
            </div>
          </div>

          <div className="reference-proof">
            <div className="reference-proof-review">
              <div className="reference-proof-head">
                <span className="reference-proof-who"><span className="reference-avatar">TW</span> Tom W.</span>
                <span className="reference-proof-when">2 weeks ago</span>
              </div>
              <div className="reference-proof-stars">★★★★★</div>
              <p>Great with my kids. Very patient and thorough.</p>
            </div>
            <div className="reference-proof-outcome">
              <div className="big-stars">★ ★ ★ ★ ★</div>
              <h3><CheckCircle2 /> Reputation Restored.</h3>
              <p className="reference-proof-meta">Policy violations reported · <span>★</span> rating context tracked</p>
            </div>
          </div>
        </section>

        <div className="reference-press" aria-hidden="true">
          <div className="reference-press-track">
            {["Forbes", "Business Insider", "CEO", "Inc.", "Forbes", "Business Insider", "CEO", "Inc."].map((name, index) => (
              <span key={`${name}-${index}`} className={`press-${name.toLowerCase().split(" ")[0]}`}>{name}</span>
            ))}
          </div>
        </div>

        <div className="reference-tilt">
          {[
            { stars: "★★★★★", text: "\"Cleared the two fake reviews that were costing us bookings.\"", who: "Multi-location dental group" },
            { stars: "★★★★★", text: "\"A fake 1-star from a competitor was flagged with real evidence.\"", who: "Home services brand" },
            { stars: "★★★★★", text: "\"No retainer, no guesswork — we see every case status.\"", who: "Franchise operator" },
            { stars: "★★★★★", text: "\"The portal shows exactly what Google decided, good or bad.\"", who: "Hospitality group" },
            { stars: "★★★★★", text: "\"Honest about what can and can't be removed.\"", who: "Medical practice" },
          ].map((card) => (
            <article key={card.who}>
              <div className="t-stars">{card.stars}</div>
              <p className="mt-2">{card.text}</p>
              <b>{card.who}</b>
            </article>
          ))}
        </div>

        <ul className="reference-checks reference-checks-row">
          {["Policy-aligned AI classification", "Submission-ready evidence packages", "Multi-location workspaces", "Client-ready reporting"].map((item) => <li key={item}><CheckCircle2 />{item}</li>)}
        </ul>



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

      {chatOpen ? (
        <div className="reference-chat">
          <div className="reference-chat-bubble">
            <span>Have bad reviews you want to remove?</span>
            <button type="button" onClick={() => setChatOpen(false)} aria-label="Dismiss"><X className="size-3.5" /></button>
          </div>
          <button type="button" onClick={openScanner} className="reference-chat-avatar" aria-label="Start a review audit">RW</button>
        </div>
      ) : null}
    </div>

  );
}