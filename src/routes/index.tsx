import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  Flag,
  Info,
  LayoutGrid,
  MapPin,
  MessageSquareQuote,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
} from "lucide-react";


import { BrandMark, StarRating, Wordmark } from "@/components/brand";
import { ReferenceLanding } from "@/components/reference-landing";
import {
  ClosingSection,
  DashboardSection,
  FaqSection,
  ImpressionSection,
  IndustriesSection,
  PlatformsSection,
  ProblemsSection,
  PromiseSection,
  SiteFooter,
  StepsSection,
} from "@/components/landing";
import { Button } from "@/components/ui/button";
import { ScanProgress } from "@/components/scan-progress";
import { AnalysisPanel } from "@/components/analysis-panel";
import { analyzeReviewForPolicy, scanReviewUrl } from "@/lib/review.functions";
import { saveCase } from "@/lib/cases.functions";
import type { ScanResult } from "@/lib/review.functions";
import type { BusinessInfo, ReviewAnalysis, ReviewInfo } from "@/lib/analysis-types";
import { looksLikeUrl } from "@/lib/platforms";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Removal Work — AI Review Policy Intelligence" },
      {
        name: "description",
        content:
          "Paste a Google review link and let AI check it against platform policies, weigh the evidence and prepare the strongest legitimate report.",
      },
      { property: "og:title", content: "Removal Work — AI Review Policy Intelligence" },
      {
        property: "og:description",
        content:
          "Paste a review link. AI finds the business, reads the review and tells you in plain English whether it breaks the rules.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Home,
});

type Stage = "idle" | "scanning" | "picking" | "analyzing" | "result";

const SCAN_STEPS = [
  "Reading your link…",
  "Finding the business…",
  "Collecting the reviews we can see…",
  "Getting everything ready…",
];

const ANALYSIS_STEPS = [
  "Reading the review…",
  "Checking it against the rules…",
  "Arguing the other side…",
  "Writing your result…",
];

function Home() {
  const scan = useServerFn(scanReviewUrl);
  const analyze = useServerFn(analyzeReviewForPolicy);
  const save = useServerFn(saveCase);

  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [review, setReview] = useState<ReviewInfo | null>(null);
  const [analysis, setAnalysis] = useState<ReviewAnalysis | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSignedIn(Boolean(data.session)));
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "INITIAL_SESSION") {
        setSignedIn(Boolean(session));
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleScan(event: React.FormEvent) {
    event.preventDefault();
    const value = url.trim();
    if (!looksLikeUrl(value)) {
      setError({
        message: "That doesn't look like a review link yet.",
        hint: "Copy the whole link from your browser's address bar, starting with https://",
      });
      return;
    }

    setError(null);
    setAnalysis(null);
    setReview(null);
    setResult(null);
    setStage("scanning");

    const response = await scan({ data: { url: value } });
    if (!response.ok) {
      setError({ message: response.message, hint: response.hint });
      setStage("idle");
      return;
    }

    setResult(response.result);
    if (response.result.reviews.length === 0) {
      setStage("picking");
      return;
    }
    setStage("picking");
  }

  async function handleAnalyze(selected: ReviewInfo, business: BusinessInfo) {
    setReview(selected);
    setError(null);
    setStage("analyzing");

    if (signedIn && result) {
      try {
        const savedResult = await save({
          data: {
            platform: result.platform,
            sourceUrl: result.sourceUrl,
            business,
            review: selected,
          },
        });
        setAnalysis(savedResult.analysis);
        setStage("result");
        setSaved(true);
        return;
      } catch (saveError) {
        console.error(saveError);
        setError({ message: "We couldn't save this analysis.", hint: "Please try again." });
        setStage("picking");
        return;
      }
    }

    const response = await analyze({ data: { business, review: selected } });
    if (!response.ok) {
      setError({ message: response.message, hint: response.hint });
      setStage("picking");
      return;
    }

    setAnalysis(response.analysis);
    setStage("result");
    setSaved(false);

  }

  function reset() {
    setStage("idle");
    setAnalysis(null);
    setReview(null);
    setResult(null);
    setError(null);
    setSaved(false);
  }

  const busy = stage === "scanning" || stage === "analyzing";

  return (
    <main className="premium-home grid-bg relative min-h-screen overflow-hidden bg-background">
      {stage === "idle" ? (
        <ReferenceLanding signedIn={signedIn} url={url} setUrl={setUrl} onScan={handleScan} busy={busy} />
      ) : null}
      {stage !== "idle" ? <header className="site-nav sticky top-0 z-50">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <Wordmark />
          <nav className="hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex">
            <a href="#how" className="transition hover:text-ink">How it works</a>
            <a href="#platforms" className="transition hover:text-ink">Platforms</a>
            <a href="#faq" className="transition hover:text-ink">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to={signedIn ? "/dashboard" : "/auth"}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card/70 px-3.5 py-2 text-sm font-medium text-ink backdrop-blur transition hover:border-primary/40 hover:bg-muted"
            >
              <LayoutGrid className="size-4 text-primary" />
              {signedIn ? "Dashboard" : "Client login"}
            </Link>
            <a
              href="#scan"
              className="cta-glow hidden h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold sm:inline-flex"
            >
              Scan a review
              <ArrowRight className="size-4" />
            </a>
          </div>
        </div>
      </header> : null}

      <div className="mx-auto w-full max-w-[1400px] px-3 pb-24 sm:px-6 lg:px-8">
        {stage === "scanning" ? (
          <>
            <section id="scan" className="hero-shell animate-rise relative overflow-hidden rounded-[18px] border border-border px-5 pb-24 pt-9 sm:px-10 sm:pb-28 sm:pt-12 lg:px-14 lg:pb-32">
              <div className="hero-grain pointer-events-none absolute inset-0" />
              <div className="relative grid items-center gap-12 lg:grid-cols-[1.04fr_.96fr] lg:gap-16">
                <div>
                   <span className="glass-badge inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                     <Sparkles className="blink-star size-4 text-primary" />
                     AI policy intelligence for Google reviews
                  </span>
                  <h1 className="mt-6 max-w-3xl font-display text-[clamp(2.85rem,6vw,5.65rem)] font-semibold leading-[.98] text-ink">
                     Remove policy-violating reviews. <span className="text-gradient-brand">Protect the rating you earned.</span>
                  </h1>
                  <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                    Paste a Google review link. AI reads the real content, checks policy, builds the evidence and helps you track the outcome.
                  </p>
                  <div className="mt-7 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-safe" />Evidence, not guesswork</span>
                    <span className="hidden h-4 w-px bg-border sm:block" />
                    <span className="inline-flex items-center gap-2"><Clock className="size-4 text-star" />Track every case</span>
                  </div>
                </div>

                <div className="scanner-stage relative mx-auto w-full max-w-xl">
                   <div className="scanner-orbit" aria-hidden="true" />
                   <div className="scanner-halo" aria-hidden="true" />
                   <div className="scanner-panel card-3d relative overflow-hidden rounded-[18px] border border-border bg-background/75 p-4 shadow-2xl backdrop-blur-xl sm:p-6">
                    <div className="flex items-center justify-between border-b border-border pb-4">
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 items-center justify-center rounded-xl bg-primary/15 text-primary"><Radar className="size-5" /></span>
                        <div>
                          <p className="text-sm font-semibold text-ink">Review intelligence</p>
                          <p className="text-xs text-muted-foreground">Google review policy scan</p>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-safe"><span className="status-pulse size-2 rounded-full bg-safe" />Live</span>
                    </div>

                    <form onSubmit={handleScan} className="mt-5">
                      <label htmlFor="review-url" className="text-xs font-semibold uppercase text-muted-foreground">Review URL</label>
                      <div className="mt-2 flex min-h-14 items-center gap-3 rounded-xl border border-input bg-card/75 px-4 transition focus-within:border-primary/60 focus-within:ring-4 focus-within:ring-primary/10">
                        <Search className="size-5 shrink-0 text-primary" />
                        <input
                          id="review-url"
                          value={url}
                          onChange={(event) => setUrl(event.target.value)}
                          inputMode="url"
                          autoComplete="off"
                          placeholder="Paste a Google review link"
                          aria-label="Review link"
                          className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted-foreground"
                        />
                      </div>
                      <Button type="submit" disabled={busy} className="cta-glow mt-3 h-14 w-full rounded-xl text-base font-semibold">
                        Scan review free <ArrowRight className="size-4.5" />
                      </Button>
                    </form>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      <MiniSignal icon={MessageSquareQuote} label="Review" />
                      <MiniSignal icon={Bot} label="AI check" active />
                      <MiniSignal icon={ShieldCheck} label="Evidence" />
                    </div>
                    <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground">Independent tool — not affiliated with Google</p>
                  </div>
                </div>
              </div>
            </section>
            {error ? <ErrorNote {...error} /> : null}
            {stage === "scanning" ? <div className="mx-auto mt-8 max-w-xl"><ScanProgress steps={SCAN_STEPS} done={false} /></div> : null}
          </>
        ) : null}

        {result && (stage === "picking" || stage === "analyzing" || stage === "result") ? (
          <section className="animate-rise space-y-5 pt-4">
            <BusinessHeader business={result.business} onReset={reset} />

            {stage === "picking" ? (
              <>
                {error ? <ErrorNote {...error} /> : null}
                {result.reviews.length === 0 ? (
                  <div className="surface p-6 text-center">
                    <p className="font-medium text-ink">
                      Google isn't sharing any review text for this business.
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Without the words of the review there's nothing we can check. Try a business
                      page that shows written reviews.
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold text-ink">
                        Pick the review you want checked
                      </h2>
                      <span className="text-sm text-muted-foreground">
                        {result.reviews.length} available
                      </span>
                    </div>
                    <div className="grid gap-3">
                      {result.reviews.map((item, index) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleAnalyze(item, result.business)}
                          className="surface surface-hover animate-rise group w-full p-4 text-left sm:p-5"
                          style={{ animationDelay: `${index * 60}ms` }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <span className="flex size-9 items-center justify-center rounded-full bg-muted text-sm font-semibold text-ink">
                                {item.authorName.charAt(0)}
                              </span>
                              <div>
                                <p className="text-sm font-semibold text-ink">{item.authorName}</p>
                                <p className="text-xs text-muted-foreground">{item.relativeTime}</p>
                              </div>
                            </div>
                            <StarRating value={item.rating} showValue={false} />
                          </div>
                          <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-foreground">
                            {item.text || "This reviewer left a rating without any text."}
                          </p>
                          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                            Check this review
                            <ArrowRight className="size-4 transition group-hover:translate-x-0.5" />
                          </span>
                        </button>
                      ))}
                    </div>
                    {result.limitation ? <Note text={result.limitation} /> : null}
                  </>
                )}
              </>
            ) : null}

            {stage === "analyzing" ? <ScanProgress steps={ANALYSIS_STEPS} done={false} /> : null}

            {stage === "result" && analysis && review ? (
              <>
                <ReviewHero review={review} />
                <AnalysisPanel
                  analysis={analysis}
                  onBack={() => setStage("picking")}
                  onReport={() => window.open(review.reviewUrl, "_blank", "noopener")}
                />
                <Note text="We can't remove a review for you. Google decides that. This opens the review on Google so you can flag it there with the reasoning above." />
                {signedIn ? (
                  <p className="text-center text-sm text-muted-foreground">
                    {saved ? "Saved to your dashboard. " : ""}
                    <Link to="/dashboard" className="font-medium text-primary hover:underline">
                      Open your reviews
                    </Link>
                  </p>
                ) : (
                  <p className="text-center text-sm text-muted-foreground">
                    <Link to="/auth" className="font-medium text-primary hover:underline">
                      Sign in
                    </Link>{" "}
                    to save this case and track what happens after you report it.
                  </p>
                )}
              </>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}

function BusinessHeader({ business, onReset }: { business: BusinessInfo; onReset: () => void }) {
  return (
    <div className="surface flex flex-wrap items-start justify-between gap-4 p-5">
      <div className="flex items-start gap-3">
        <BrandMark className="size-10" />
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">{business.name}</h2>
          {business.address ? (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {business.address}
            </p>
          ) : null}
          {business.rating ? (
            <div className="mt-2 flex items-center gap-2">
              <StarRating value={business.rating} />
              <span className="text-sm text-muted-foreground">
                {business.ratingCount?.toLocaleString()} reviews
              </span>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <a
          href={business.mapsUri}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition hover:text-ink"
        >
          View on Google
          <ExternalLink className="size-3.5" />
        </a>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-ink transition hover:bg-muted"
        >
          New scan
        </button>
      </div>
    </div>
  );
}

function ReviewHero({ review }: { review: ReviewInfo }) {
  return (
    <div className="surface animate-rise p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-ink">
            {review.authorName.charAt(0)}
          </span>
          <div>
            <p className="font-semibold text-ink">{review.authorName}</p>
            <p className="text-xs text-muted-foreground">{review.relativeTime}</p>
          </div>
        </div>
        <StarRating value={review.rating} />
      </div>
      <p className="mt-4 text-[15px] leading-relaxed text-foreground">
        {review.text || "This reviewer left a rating without any text."}
      </p>
    </div>
  );
}

function Pill({ label, ready = false }: { label: string; ready?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
        ready
          ? "border-safe/30 bg-safe-soft text-safe"
          : "border-border bg-card text-muted-foreground"
      }`}
    >
      <span className={`size-1.5 rounded-full ${ready ? "bg-safe" : "bg-muted-foreground/50"}`} />
      {label}
    </span>
  );
}

function MiniSignal({ icon: Icon, label, active = false }: { icon: typeof Search; label: string; active?: boolean }) {
  return (
    <div className={`signal-tile flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border px-2 text-center ${active ? "border-primary/35 bg-primary/10" : "border-border bg-card/50"}`}>
      <Icon className={`size-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <span className="text-xs font-medium text-ink">{label}</span>
    </div>
  );
}

const WORKFLOW = [
  {
    icon: MessageSquareQuote,
    label: "The review",
    body: "Pulled straight from Google",
    tone: "bg-star-soft text-star",
  },
  {
    icon: Sparkles,
    label: "AI policy check",
    body: "Both sides weighed up",
    tone: "bg-info-soft text-primary",
  },
  {
    icon: ClipboardList,
    label: "Evidence",
    body: "The exact lines that matter",
    tone: "bg-info-soft text-primary",
  },
  {
    icon: Flag,
    label: "Report",
    body: "One clear next step",
    tone: "bg-warn-soft text-warn",
  },
  {
    icon: Clock,
    label: "Track",
    body: "Know where it stands",
    tone: "bg-warn-soft text-warn",
  },
  {
    icon: CheckCircle2,
    label: "Outcome",
    body: "Removed, or honestly not",
    tone: "bg-safe-soft text-safe",
  },
] as const;

function Workflow() {
  return (
    <div className="relative z-10 -mt-16 px-1 sm:-mt-20 sm:px-6 lg:px-10">
      <ol className="workflow-ribbon mx-auto grid max-w-5xl grid-cols-3 gap-2 sm:grid-cols-6 sm:gap-3">
        {WORKFLOW.map((step, index) => (
          <li
            key={step.label}
            className="workflow-card animate-rise relative min-h-28 overflow-hidden rounded-xl border border-border p-3.5 shadow-xl sm:min-h-32 sm:p-4"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            <span
              className={`inline-flex size-8 items-center justify-center rounded-lg ${step.tone}`}
            >
              <step.icon className="size-4" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink">{step.label}</p>
            <p className="mt-1 hidden text-[11px] leading-relaxed text-muted-foreground sm:block">{step.body}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TrustSection() {
  return (
    <section className="mx-auto grid max-w-6xl gap-10 px-3 pb-8 pt-32 sm:pt-36 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:gap-20 lg:pt-44">
      <div className="animate-rise">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-primary"><Sparkles className="size-4" />Built for honest reputation work</span>
        <h2 className="mt-4 max-w-lg font-display text-3xl font-semibold leading-tight text-ink sm:text-5xl">Know what breaks policy before you report it.</h2>
        <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">The analysis weighs evidence and counter-evidence, then recommends the strongest legitimate next step. Google always makes the final decision.</p>
      </div>
      <div>
        <p className="mb-4 text-sm font-semibold text-ink">One simple workflow</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <TrustTile icon={Star} label="Rating context" tone="text-star bg-star-soft" />
          <TrustTile icon={MessageSquareQuote} label="Real review" tone="text-info bg-info-soft" />
          <TrustTile icon={Bot} label="AI analysis" tone="text-primary bg-primary/10" />
          <TrustTile icon={ClipboardList} label="Policy evidence" tone="text-info bg-info-soft" />
          <TrustTile icon={Flag} label="Report path" tone="text-warn bg-warn-soft" />
          <TrustTile icon={CheckCircle2} label="Outcome tracking" tone="text-safe bg-safe-soft" />
        </div>
        <div className="mt-5 flex flex-wrap gap-2"><Pill label="Google connected" ready /><Pill label="Facebook soon" /><Pill label="Instagram soon" /></div>
      </div>
    </section>
  );
}

function TrustTile({ icon: Icon, label, tone }: { icon: typeof Search; label: string; tone: string }) {
  return (
    <div className="surface surface-hover flex min-h-24 items-center gap-3 rounded-xl p-4">
      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${tone}`}><Icon className="size-4.5" /></span>
      <span className="text-sm font-semibold text-ink">{label}</span>
    </div>
  );
}

function Note({ text }: { text: string }) {
  return (
    <p className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
      <Info className="mt-0.5 size-4 shrink-0" />
      {text}
    </p>
  );
}

function ErrorNote({ message, hint }: { message: string; hint: string }) {
  return (
    <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-danger/25 bg-danger-soft px-4 py-3 text-left">
      <p className="text-sm font-semibold text-danger">{message}</p>
      {hint ? <p className="mt-1 text-sm text-danger/80">{hint}</p> : null}
    </div>
  );
}
