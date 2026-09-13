import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import {
  ArrowRight,
  ExternalLink,
  Info,
  MapPin,
  MessageSquareQuote,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { BrandMark, StarRating, Wordmark } from "@/components/brand";
import { ScanProgress } from "@/components/scan-progress";
import { AnalysisPanel } from "@/components/analysis-panel";
import { analyzeReviewForPolicy, scanReviewUrl } from "@/lib/review.functions";
import type { ScanResult } from "@/lib/review.functions";
import type { BusinessInfo, ReviewAnalysis, ReviewInfo } from "@/lib/analysis-types";
import { looksLikeUrl } from "@/lib/platforms";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Review Shield — Check a review for policy violations" },
      {
        name: "description",
        content:
          "Paste a Google review link and let AI check it against platform policies, weigh the evidence and prepare the strongest legitimate report.",
      },
      { property: "og:title", content: "Review Shield — Check a review in seconds" },
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

  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState<{ message: string; hint: string } | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [review, setReview] = useState<ReviewInfo | null>(null);
  const [analysis, setAnalysis] = useState<ReviewAnalysis | null>(null);

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

    const response = await analyze({ data: { business, review: selected } });
    if (!response.ok) {
      setError({ message: response.message, hint: response.hint });
      setStage("picking");
      return;
    }

    setAnalysis(response.analysis);
    setStage("result");
  }

  function reset() {
    setStage("idle");
    setAnalysis(null);
    setReview(null);
    setResult(null);
    setError(null);
  }

  const busy = stage === "scanning" || stage === "analyzing";

  return (
    <main className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-5 py-5">
        <Wordmark />
        <span className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex">
          <ShieldCheck className="size-3.5 text-safe" />
          Independent tool — not affiliated with Google
        </span>
      </header>

      <div className="mx-auto w-full max-w-4xl px-5 pb-24">
        {stage === "idle" || stage === "scanning" ? (
          <section className="pt-8 text-center sm:pt-16">
            <h1 className="text-balance font-display text-4xl font-semibold leading-[1.05] text-ink sm:text-6xl">
              Find problematic <span className="text-gradient-brand">reviews.</span> Fast.
            </h1>
            <p className="mx-auto mt-4 max-w-lg text-balance text-base leading-relaxed text-muted-foreground sm:text-lg">
              Paste a review link and let AI check it for policy violations.
            </p>

            <form onSubmit={handleScan} className="mx-auto mt-9 w-full max-w-2xl">
              <div className="surface flex flex-col gap-2 p-2.5 sm:flex-row sm:items-center sm:rounded-[28px] sm:p-2">
                <div className="flex flex-1 items-center gap-3 px-3 py-2">
                  <Search className="size-5 shrink-0 text-muted-foreground" />
                  <input
                    value={url}
                    onChange={(event) => setUrl(event.target.value)}
                    inputMode="url"
                    autoComplete="off"
                    placeholder="Paste a Google review link"
                    aria-label="Review link"
                    className="w-full bg-transparent text-base text-ink outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-2xl bg-primary px-7 text-base font-semibold text-primary-foreground shadow-soft transition hover:brightness-110 disabled:opacity-60 sm:rounded-[22px]"
                >
                  Scan review
                  <ArrowRight className="size-4.5" />
                </button>
              </div>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
              <Pill label="Google" ready />
              <Pill label="Facebook" />
              <Pill label="Instagram" />
              <Pill label="More soon" />
            </div>

            {error ? <ErrorNote {...error} /> : null}

            {stage === "scanning" ? (
              <div className="mt-10">
                <ScanProgress steps={SCAN_STEPS} done={false} />
              </div>
            ) : null}

            {stage === "idle" ? (
              <div className="mx-auto mt-14 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
                <Highlight
                  icon={<MessageSquareQuote className="size-4.5" />}
                  title="We read the review"
                  body="We find the business and pull the review straight from the platform."
                />
                <Highlight
                  icon={<Sparkles className="size-4.5" />}
                  title="AI checks the rules"
                  body="It weighs both sides before deciding — a harsh review isn't a broken rule."
                />
                <Highlight
                  icon={<ShieldCheck className="size-4.5" />}
                  title="You get one clear answer"
                  body="Plain English, with the evidence, the risks and what to do next."
                />
              </div>
            ) : null}
          </section>
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
                          className="surface animate-rise group w-full p-4 text-left transition hover:shadow-lift sm:p-5"
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

function Highlight({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="surface p-4">
      <span className="inline-flex size-9 items-center justify-center rounded-xl bg-info-soft text-primary">
        {icon}
      </span>
      <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
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
