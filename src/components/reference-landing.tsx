import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, CheckCircle2, Facebook, Instagram, Mail, MapPin, Phone, Scale, ShieldCheck, Sparkles, Star, Youtube } from "lucide-react";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

import analyticsIcon from "@/assets/reference-icons/analytics.png";
import casesIcon from "@/assets/reference-icons/cases.png";
import locationsIcon from "@/assets/reference-icons/locations.png";
import reportsIcon from "@/assets/reference-icons/reports.png";
import reviewsIcon from "@/assets/reference-icons/reviews.png";
import scannerIcon from "@/assets/reference-icons/scanner.png";
import { SiteHeader } from "@/components/site-header";
import { Button } from "@/components/ui/button";



const platforms = [
  { name: "Google · Live", glyph: "G", color: "#4285f4" },
  { name: "Instagram · Planned", icon: Instagram, color: "#e1306c" },
  { name: "Trustpilot · Planned", icon: Star, color: "#00b67a" },
  { name: "Facebook · Planned", icon: Facebook, color: "#1877f2" },
  { name: "Reddit · Planned", glyph: "r", color: "#ff4500" },
  { name: "Indeed · Planned", glyph: "i", color: "#2164f3" },
  { name: "TripAdvisor · Planned", glyph: "oo", color: "#34e0a1" },
  { name: "Airbnb · Planned", glyph: "A", color: "#ff5a5f" },
  { name: "X · Planned", glyph: "𝕏", color: "#e7e9ea" },
  { name: "YouTube · Planned", icon: Youtube, color: "#ff0000" },
  { name: "Glassdoor · Planned", glyph: "g", color: "#0caa41" },
  { name: "More · Planned", glyph: "+", color: "#b8f26d" },
];

const features = [
  { icon: scannerIcon, title: "AI policy violation scanner", body: "Every review is analysed against Google's published review policies — spam, fake content, off-topic, conflict of interest, harassment and more — with a confidence score and written rationale." },
  { icon: reviewsIcon, title: "Review operations at scale", body: "Import or scan reviews, filter by rating, category, priority and status, and batch-triage the queue without losing a single record." },
  { icon: casesIcon, title: "Removal case management", body: "Move cases from New through evidence preparation and the outcome you record, with a clear history of saved case changes." },
  { icon: reportsIcon, title: "Evidence packages", body: "Build a professional, submission-ready summary containing the review, business context, policy category and AI analysis." },
  { icon: analyticsIcon, title: "Reputation analytics", body: "Rating context, violation mix, negative-review tracking and per-location case status computed from your saved workspace data." },
  { icon: locationsIcon, title: "Multi-location workspaces", body: "One workspace for your business, with per-location attribution for every review and case." },
];

function WalkingClient({ x, delay, leaving = false }: { x: number; delay: number; leaving?: boolean }) {
  return (
    <g className="client-position" transform={`translate(${x} 0)`}>
      <g className={`vector-client ${leaving ? "vector-client-leaving" : ""}`} style={{ "--walk-delay": `${delay}s` } as React.CSSProperties}>
        <ellipse className="client-shadow" cx="0" cy="274" rx="22" ry="5" />
        <g className="client-body">
          <circle className="client-head" cx="0" cy="197" r="11" />
          <path className="client-torso" d="M-7 211 Q0 205 7 211 L11 242 Q0 249 -11 242Z" />
          <path className="client-limb client-arm-a" d="M-7 216 Q-18 228 -20 239" />
          <path className="client-limb client-arm-b" d="M7 216 Q18 227 23 234" />
          <path className="client-limb client-leg-a" d="M-5 242 Q-11 258 -18 272" />
          <path className="client-limb client-leg-b" d="M5 242 Q13 257 20 270" />
        </g>
      </g>
    </g>
  );
}

function RatingScene({ quiet = false }: { quiet?: boolean }) {
  return (
    <svg className={`rating-vector-scene ${quiet ? "rating-vector-quiet" : "rating-vector-busy"}`} viewBox="0 0 620 310" role="img" aria-label={quiet ? "A customer walking away from a poorly rated business" : "Customers walking toward a highly rated business"}>
      <defs>
        <linearGradient id={quiet ? "shop-wall-quiet" : "shop-wall-busy"} x1="0" y1="0" x2="1" y2="1"><stop className="shop-wall-light" /><stop offset="1" className="shop-wall-dark" /></linearGradient>
        <linearGradient id={quiet ? "shop-roof-quiet" : "shop-roof-busy"} x1="0" y1="0" x2="0" y2="1"><stop className="shop-roof-light" /><stop offset="1" className="shop-roof-dark" /></linearGradient>
        <radialGradient id={quiet ? "window-glow-quiet" : "window-glow-busy"}><stop className="window-glow-core" /><stop offset="1" className="window-glow-edge" /></radialGradient>
        <filter id={quiet ? "soft-glow-quiet" : "soft-glow-busy"} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="9" /></filter>
      </defs>

      <path className="scene-ground-glow" d="M14 276 H606" />
      {!quiet && <>
        <path className="scene-arc scene-arc-a" d="M58 257 Q214 94 420 221" />
        <path className="scene-arc scene-arc-b" d="M86 268 Q237 125 435 226" />
        <g className="money-token money-token-a"><circle r="19" /><text x="0" y="8">$</text></g>
        <g className="money-token money-token-b"><circle r="22" /><text x="0" y="8">$</text></g>
        <g className="money-token money-token-c"><circle r="24" /><text x="0" y="9">$</text></g>
      </>}
      {quiet && <>
        <path className="loss-vector-arc" d="M88 238 Q226 75 392 220" />
        <g className="negative-review-vector" transform="translate(285 94) rotate(12)"><path d="M-30-24 H30 Q38-24 38-16 V19 Q38 27 30 27 H-6 L-20 42 V27 H-30 Q-38 27-38 19 V-16 Q-38-24-30-24Z" /><path className="negative-star" d="M0-15 5-5 17-3 8 5 10 17 0 11-10 17-8 5-17-3-5-5Z" /><path className="review-speed" d="M-55-10h-19M-54 2h-28M-51 14h-16" /></g>
      </>}

      <g className="vector-shop" transform={quiet ? "translate(405 112)" : "translate(365 91)"}>
        <ellipse className="shop-halo" cx="105" cy="171" rx="136" ry="74" filter={`url(#${quiet ? "soft-glow-quiet" : "soft-glow-busy"})`} />
        <path className="shop-side" d={quiet ? "M175 51 205 64V178H175Z" : "M194 49 224 64V188H194Z"} />
        <rect className="shop-main" x="0" y="47" width={quiet ? "176" : "196"} height={quiet ? "131" : "141"} fill={`url(#${quiet ? "shop-wall-quiet" : "shop-wall-busy"})`} />
        <rect className="shop-sign" x={quiet ? "73" : "82"} y="11" width="58" height="37" rx="3" fill={`url(#${quiet ? "shop-roof-quiet" : "shop-roof-busy"})`} />
        <path className="shop-roof-vector" d={quiet ? "M-14 43Q-14 35-6 35H181L205 48V60H-14Z" : "M-15 43Q-15 34-7 34H202L225 48V61H-15Z"} fill={`url(#${quiet ? "shop-roof-quiet" : "shop-roof-busy"})`} />
        {!quiet && <g className="shop-awning-vector"><path d="M-4 61H199L190 100H4Z" /><path d="M20 61 15 100M50 61 48 100M80 61 81 100M111 61 114 100M143 61 147 100M174 61 181 100" /></g>}
        <rect className="shop-window-vector" x="19" y={quiet ? "78" : "111"} width={quiet ? "72" : "91"} height={quiet ? "63" : "62"} rx="2" fill={`url(#${quiet ? "window-glow-quiet" : "window-glow-busy"})`} />
        <path className="window-bars" d={quiet ? "M55 78v63M19 109h72" : "M65 111v62M19 142h91"} />
        <rect className="shop-door-vector" x={quiet ? "116" : "132"} y={quiet ? "72" : "99"} width="48" height={quiet ? "106" : "89"} rx="2" fill={`url(#${quiet ? "window-glow-quiet" : "window-glow-busy"})`} />
        <circle className="door-knob" cx={quiet ? "153" : "170"} cy={quiet ? "127" : "151"} r="2.5" />
      </g>

      {!quiet ? <g className="client-stream">
        {[52, 126, 200, 274, 348, 422].map((x, index) => <WalkingClient key={x} x={x} delay={index * -.82} />)}
      </g> : <g className="leaving-stream" transform="translate(252 0) scale(-1 1)"><WalkingClient x={0} delay={0} leaving /></g>}
    </svg>
  );
}

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

  useEffect(() => {
    const saved = window.localStorage.getItem("removal-work-appearance");
    const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
    setLightMode(saved ? saved === "light" : prefersLight);
    if (window.location.hash === "#scan") {
      setScannerOpen(true);
      window.setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>("#reference-review-url");
        input?.scrollIntoView({ behavior: "smooth", block: "center" });
        input?.focus({ preventScroll: true });
      }, 100);
    }
  }, []);

  function toggleAppearance() {
    setLightMode((current) => {
      const next = !current;
      window.localStorage.setItem("removal-work-appearance", next ? "light" : "dark");
      return next;
    });
  }

  function openScanner() {
    setScannerOpen(true);
    window.setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>("#reference-review-url");
      input?.scrollIntoView({ behavior: "smooth", block: "center" });
      input?.focus({ preventScroll: true });
    }, 50);
  }

  return (
    <div className={`reference-page ${lightMode ? "reference-light" : ""}`}>
      <SiteHeader
        signedIn={signedIn}
        onScanClick={openScanner}
        lightMode={lightMode}
        onToggleAppearance={toggleAppearance}
      />

      <div className="reference-wrap">
        <section className="reference-hero">
          <div className="reference-copy">
            <h1>Report Only<br />What Breaks The Rules</h1>
            <p>Google review scanning is live now. Other platform connections are planned.<br />No policy violation, no report. It&apos;s that simple.</p>
            <div className="reference-actions">
              <button type="button" onClick={openScanner} className="reference-gradient-button reference-primary-action">Get Your Free Review Audit <span className="arrow-dot"><ArrowRight className="size-3.5" /></span></button>
              <a href="#how" className="reference-outline-button reference-secondary-action">See How It Works <ArrowRight className="size-4" /></a>
            </div>
          </div>

          <div className="reference-proof" aria-label="Illustrative review analysis animation">
            <span className="proof-demo-label">Example review analysis</span>
            <div className="proof-business">
              <span className="proof-business-mark"><ShieldCheck /></span>
              <div><b>Example Dental Practice</b><p><span>★★★★★</span> <strong className="proof-rating"><i>3.9</i><i>4.6</i><i>5.0</i></strong> <span className="proof-count"><i>29</i><i>28</i><i>27</i></span> illustrative reviews</p></div>
            </div>
            <div className="proof-review-stack">
              <article className="proof-row proof-row-one">
                <div><span className="reference-avatar">ML</span><b>Maria L.</b><time>1 week ago</time></div>
                <span className="proof-row-stars">★★★★★</span><p>Best dental experience I&apos;ve ever had. Dr. Chen is incredible.</p>
              </article>
              <article className="proof-row proof-row-bad proof-row-two">
                <div><span className="reference-avatar">JR</span><b>James R.</b><time>3 weeks ago</time></div>
                <span className="proof-row-stars">★☆☆☆☆</span><p>Wouldn&apos;t recommend. Rude front desk and ended up paying way...</p>
                <strong className="proof-issue-badge">Policy issue detected</strong>
                <span className="proof-scan-line" />
              </article>
              <article className="proof-row proof-row-three">
                <div><span className="reference-avatar">TW</span><b>Tom W.</b><time>2 weeks ago</time></div>
                <span className="proof-row-stars">★★★★★</span><p>Great with my kids. Very patient and thorough.</p>
              </article>
              <article className="proof-row proof-row-bad proof-row-four">
                <div><span className="reference-avatar">MK</span><b>Mike T.</b><time>2 months ago</time></div>
                <span className="proof-row-stars">★☆☆☆☆</span><p>Showed up to my appointment and they had no record of it...</p>
                <strong className="proof-issue-badge">Policy issue detected</strong>
                <span className="proof-scan-line" />
              </article>
            </div>
            <div className="reference-proof-outcome">
              <div className="big-stars">★★★★★</div>
              <h3><CheckCircle2 /> Analysis Complete.</h3>
              <p className="reference-proof-meta">2 possible policy issues · <span>★</span> illustrative rating context</p>
            </div>
          </div>
        </section>

        <div className="reference-press" aria-label="Removal Work workflow">
          <div className="reference-press-track">
            {["Real review", "Policy check", "Evidence", "Your decision", "Real review", "Policy check", "Evidence", "Your decision"].map((name, index) => (
              <span key={`${name}-${index}`} className={`press-${name.toLowerCase().split(" ")[0]}`}>{name}</span>
            ))}
          </div>
        </div>

        <div className="reference-tilt">
          {[
            { stars: "01", text: "Read the review and its available business context.", who: "Source review" },
            { stars: "02", text: "Compare the words against published policy categories.", who: "Policy analysis" },
            { stars: "03", text: "Weigh supporting evidence and the strongest counterargument.", who: "Adversarial check" },
            { stars: "04", text: "Prepare a report only when the evidence supports one.", who: "Human decision" },
            { stars: "05", text: "Record the outcome you actually observe — never assume it.", who: "Honest tracking" },
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

        <section id="platforms" className="reference-platforms">
          <div className="reference-platforms-copy">
            <h2>Finally, a way for businesses to protect themselves and <span>fight back.</span></h2>
            <div className="reference-platforms-shield" aria-hidden="true">
              <ShieldCheck />
              <i className="shield-spark shield-spark-a" />
              <i className="shield-spark shield-spark-b" />
            </div>
            <p>Google review scanning is live today — every other platform joins the same simple paste → AI check → report → track flow as it rolls out.</p>
          </div>
          <div className="reference-platforms-grid-wrap">
            <span className="reference-platforms-label">Platform roadmap</span>
            <div className="reference-platforms-grid">
              {platforms.map((platform, index) => {
                const Icon = platform.icon;
                return (
                  <article key={platform.name} style={{ animationDelay: `${index * 90}ms` }}>
                    <span className="platform-glyph" style={{ color: platform.color }}>
                      {Icon ? <Icon className="size-6" fill={platform.icon === Star || platform.icon === Youtube ? platform.color : "none"} /> : platform.glyph}
                    </span>
                    <b>{platform.name}</b>
                  </article>
                );
              })}
            </div>
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

        <section className="reference-promise">
          <div className="reference-promise-left">
            <h2>No Violation Found?<br />We Say So.</h2>
            <p>The AI tells you honestly when a review breaks the rules — and when it doesn&apos;t. No fake flags, no wasted reports.</p>
          </div>
          <div className="reference-promise-right">
            <div className="reference-promise-item">
              <h3><Scale className="promise-icon" /> Real Policy Checks. The Legit Way.</h3>
              <p>No spammed appeals, no fake claims. Every report cites the actual platform policy, the review evidence and a confidence score — and Google makes the final call.</p>
            </div>
            <div className="reference-promise-item">
              <h3><BadgeCheck className="promise-icon" /> Only Real Outcomes</h3>
              <p>Record each report handoff and the outcome you observe. No Google decision is inferred, and nothing is marked removed automatically.</p>
            </div>
          </div>
        </section>

        <section id="how" className="reference-section reference-three-steps">
          <h2>Three Steps. That&apos;s It.</h2>
          <div className="three-step-grid">
            <article className="three-step-card three-step-links">
              <div className="step-visual step-link-flight" aria-hidden="true">
                <svg viewBox="0 0 320 150" role="presentation">
                  <path className="flight-path" d="M25 118 C 92 120, 128 72, 237 39" />
                </svg>
                <span className="flight-link"><span>↗</span></span>
                <span className="flight-dot flight-dot-one" />
                <span className="flight-dot flight-dot-two" />
              </div>
              <h3>Send Us the Links</h3>
              <p>Just send us the review links. That&apos;s it. We don&apos;t need access to your Google Business Profile. Zero risk to your account, zero setup.</p>
            </article>

            <article className="three-step-card three-step-case">
              <div className="step-visual step-envelope" aria-hidden="true">
                <div className="envelope-back" />
                <span className="case-note case-note-one"><i /><i /><i /></span>
                <span className="case-note case-note-two"><i /><i /><i /></span>
                <span className="case-note case-note-three"><i /><i /><i /></span>
                <div className="envelope-front" />
                <div className="envelope-flap" />
                <span className="envelope-check">✓</span>
              </div>
              <h3>AI Builds Your Case</h3>
              <p>No spammed appeals and no unsupported claims. Our AI checks the review against published policy, organises the evidence and prepares the strongest legitimate report.</p>
            </article>

            <article className="three-step-card three-step-outcome">
              <div className="step-visual step-removal" aria-hidden="true">
                <div className="removal-review">
                  <span className="removal-avatar" />
                  <span className="removal-stars"><b>★</b> ☆ ☆ ☆ ☆</span>
                  <i /><i /><i />
                  <strong className="removed-label">Outcome recorded</strong>
                </div>
                <div className="removal-hammer">
                  <span className="hammer-handle" />
                  <span className="hammer-collar" />
                  <span className="hammer-head"><i /><i /></span>
                </div>
                <span className="impact-ring" />
                <span className="impact-spark impact-spark-one" />
                <span className="impact-spark impact-spark-two" />
                <span className="impact-spark impact-spark-three" />
              </div>
              <h3>Track the Real Outcome</h3>
              <p>Complete the report on Google, then record the action and any outcome you observe. Google makes the final decision.</p>
            </article>
          </div>
        </section>

        <section className="review-impression" aria-label="Google rating impact comparison">
          <div className="rating-showdown">
            <article className="rating-business rating-competitor">
              <span className="rating-owner">Your Competitor</span>
              <div className="rating-score"><strong>4.9</strong><span aria-label="5 stars">★★★★★</span></div>
              <RatingScene />
            </article>

            <article className="rating-business rating-you">
              <span className="rating-owner">You</span>
              <div className="rating-score rating-score-low"><strong>3.9</strong><span aria-label="3 out of 5 highlighted stars"><i>★</i><i>★</i><i>★</i><i>★</i><i>★</i></span></div>
              <RatingScene quiet />
            </article>
          </div>
        </section>

        <section className="reference-section reference-features-section">
          <h2>Built for reputation teams</h2>
          <div className="reference-features">{features.map((feature, index) => <article key={feature.title}><img src={feature.icon} alt="" style={{ animationDelay: `${index * 310}ms` }} /><h3>{feature.title}</h3><p>{feature.body}</p></article>)}</div>
        </section>

        <section className="audit-finale" aria-labelledby="audit-finale-title">
          <div className="audit-finale-copy">
            <p className="audit-finale-kicker">Protect Yourself Now</p>
            <h2 id="audit-finale-title">Get Your Free<br />Reputation<br />Audit Report</h2>
            <p className="audit-finale-lede">See whether the available review evidence shows a clear policy issue. No obligations.</p>
            <div className="audit-finale-actions">
              <button type="button" onClick={openScanner} className="audit-main-action">Get Your Free Audit <span><ArrowRight /></span></button>
              <a href="#how" className="audit-call-action">How It Works <ArrowRight /></a>
            </div>
            <p className="audit-finale-note">100% transparent. Real policy evidence, no guaranteed removals, no fake outcomes.</p>
          </div>

          <div className="audit-shield-stage" aria-hidden="true">
            <i className="audit-ray audit-ray-one" /><i className="audit-ray audit-ray-two" /><i className="audit-ray audit-ray-three" />
            <div className="audit-shield-halo" />
            <div className="audit-shield">
              <ShieldCheck />
              <span className="audit-shield-check">✓</span>
              <span className="audit-shield-star">★</span>
            </div>
          </div>

          <div className="audit-chat-panel">
            <h3>Start with a real review.</h3>
            <p>Paste the link to the review that is hurting you. Our AI reads the real review and checks the evidence.</p>
            <button type="button" onClick={openScanner} className="audit-chat-action">Open scanner <ArrowRight /></button>
            <p className="audit-chat-meta">Google review scanning is live now.</p>
          </div>
        </section>

        <footer className="reference-footer">
          <div className="reference-footer-main">
            <div className="reference-footer-brand">
              <strong>Removal Work</strong>
              <p>Policy-led review intelligence for teams that need evidence before action.</p>
            </div>
            <nav aria-label="Footer navigation">
              <div>
                <span>Product</span>
                <button type="button" onClick={openScanner}>Scan a review</button>
                <a href="#how">How it works</a>
                <a href="#platforms">Platforms</a>
              </div>
              <div>
                <span>Workspace</span>
                <Link to={signedIn ? "/dashboard" : "/auth"}>{signedIn ? "Open dashboard" : "Sign in"}</Link>
                <Link to="/dashboard">Reviews</Link>
                <Link to="/reports">Reports</Link>
              </div>
              <div className="reference-footer-contact">
                <span>Contact</span>
                <a href="mailto:removalwork59@gmail.com">
                  <Mail aria-hidden="true" />
                  <span>removalwork59@gmail.com</span>
                </a>
                <a href="tel:+923448706466">
                  <Phone aria-hidden="true" />
                  <span>+92 344 8706466</span>
                </a>
                <a href="https://www.facebook.com/share/v/1FcAkYSSMf/" target="_blank" rel="noopener noreferrer">
                  <Facebook aria-hidden="true" />
                  <span>Facebook</span>
                </a>
                <address>
                  <MapPin aria-hidden="true" />
                  <span>Aslam Abad Bakhir Wah<br />Dera Ghazi Khan, 32200</span>
                </address>
              </div>
            </nav>
          </div>
          <div className="reference-footer-bottom">
            <p>© {new Date().getFullYear()} Removal Work. All rights reserved.</p>
            <p>Not affiliated with Google. Google determines outcomes; workspace statuses are recorded by the user.</p>
          </div>
        </footer>
      </div>

      {chatOpen ? (
        <div className="reference-chat">
          <div className="reference-chat-bubble">
            <span>Have a review that may break policy?</span>
            <button type="button" onClick={() => setChatOpen(false)} aria-label="Dismiss"><X className="size-4" /></button>
          </div>
          <button type="button" onClick={openScanner} className="reference-chat-avatar" aria-label="Start a review audit">RW</button>
        </div>
      ) : null}
    </div>

  );
}