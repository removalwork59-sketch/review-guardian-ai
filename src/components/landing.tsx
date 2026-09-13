import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bot,
  Building2,
  Car,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  Facebook,
  Flag,
  Gavel,
  Globe,
  Instagram,
  Link2,
  MapPin,
  MessageSquareQuote,
  Radar,
  Scale,
  Search,
  ShieldCheck,
  Stethoscope,
  Star,
  Store,
  TrendingUp,
  Utensils,
  Wrench,
  Youtube,
} from "lucide-react";

import { BrandMark, Wordmark } from "@/components/brand";

/* ---------------------------------- platforms --------------------------------- */

const PLATFORMS = [
  { name: "Google Reviews", icon: Search, tone: "text-info", live: true },
  { name: "Google Maps", icon: MapPin, tone: "text-safe", live: true },
  { name: "Instagram", icon: Instagram, tone: "text-danger", live: false },
  { name: "Facebook", icon: Facebook, tone: "text-info", live: false },
  { name: "YouTube", icon: Youtube, tone: "text-danger", live: false },
  { name: "More platforms", icon: Globe, tone: "text-star", live: false },
] as const;

export function PlatformsSection() {
  return (
    <section id="platforms" className="mx-auto grid max-w-6xl gap-10 px-3 pt-36 sm:pt-44 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:gap-16">
      <div className="animate-rise">
        <h2 className="font-display text-4xl font-semibold leading-[1.05] text-ink sm:text-5xl">
          Finally, a way for businesses to{" "}
          <span className="text-gradient-brand">check the facts.</span>
        </h2>
        <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
          Paste a link. We read the real review, measure it against the platform's published
          policies, and show you exactly where it stands — with nothing invented.
        </p>
      </div>

      <div>
        <p className="mb-4 text-center text-lg font-semibold text-ink lg:text-left">
          Platforms we cover
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {PLATFORMS.map((p, i) => (
            <div
              key={p.name}
              className="surface surface-hover animate-rise flex min-h-28 flex-col items-center justify-center gap-2 rounded-2xl p-4 text-center"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <p.icon className={`size-6 ${p.tone}`} />
              <span className="text-sm font-semibold text-ink">{p.name}</span>
              <span
                className={`text-[11px] font-medium ${p.live ? "text-safe" : "text-muted-foreground"}`}
              >
                {p.live ? "Connected" : "Coming soon"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* --------------------------------- promise ---------------------------------- */

export function PromiseSection() {
  return (
    <section className="mx-auto mt-28 max-w-6xl px-3">
      <div className="surface animate-rise grid overflow-hidden rounded-3xl lg:grid-cols-[1fr_1fr]">
        <div className="promise-panel relative p-8 sm:p-12">
          <h2 className="font-display text-3xl font-semibold leading-[1.08] text-ink sm:text-[2.6rem]">
            If There's No Violation, We Say So.
          </h2>
          <p className="mt-5 max-w-sm leading-relaxed text-ink/85">
            No invented verdicts, no guaranteed removals. You get an honest read on whether a
            review actually breaks the rules — and the evidence behind it.
          </p>
        </div>
        <div className="space-y-8 p-8 sm:p-12">
          <div>
            <h3 className="flex items-center gap-3 font-display text-xl font-semibold text-ink">
              <Scale className="size-5 text-primary" />
              Real policy, checked both ways
            </h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              Every review is analysed against the platform's own policy, then argued from the
              other side too. You see the evidence and the counter-evidence before you act.
            </p>
          </div>
          <div className="h-px bg-border" />
          <div>
            <h3 className="flex items-center gap-3 font-display text-xl font-semibold text-ink">
              <ShieldCheck className="size-5 text-star" />
              The platform still decides
            </h3>
            <p className="mt-3 leading-relaxed text-muted-foreground">
              We never touch your business profile and never claim a review was removed. You report
              it through the official channel and track the real outcome here.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- steps ----------------------------------- */

const STEPS = [
  {
    icon: Link2,
    title: "Paste the Link",
    body: "Just paste the review link. No account access, no setup, nothing to install. We read what the platform makes public.",
  },
  {
    icon: Bot,
    title: "AI Builds Your Case",
    body: "The review is checked line by line against published policy, then challenged from the opposite side. You get the violation category, the confidence and the exact quoted evidence.",
  },
  {
    icon: Clock,
    title: "Report and Track",
    body: "You get the strongest legitimate wording and a direct path to report it. Every case stays in your dashboard with a real status until it resolves.",
  },
] as const;

export function StepsSection() {
  return (
    <section id="how" className="mx-auto mt-32 max-w-6xl px-3">
      <h2 className="animate-rise font-display text-4xl font-semibold text-ink sm:text-6xl">
        Three Steps. That's It.
      </h2>
      <div className="mt-10 grid gap-4 lg:grid-cols-3">
        {STEPS.map((step, i) => (
          <div
            key={step.title}
            className="surface surface-hover animate-rise flex flex-col rounded-3xl p-7"
            style={{ animationDelay: `${i * 90}ms` }}
          >
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
              <step.icon className="size-6" />
            </span>
            <p className="mt-8 font-display text-xl font-semibold text-ink">{step.title}</p>
            <p className="mt-3 leading-relaxed text-muted-foreground">{step.body}</p>
            <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-primary">
              Step {i + 1} of 3
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------- comparison -------------------------------- */

export function ImpressionSection() {
  return (
    <section className="mx-auto mt-32 max-w-6xl px-3">
      <h2 className="animate-rise max-w-4xl font-display text-4xl font-semibold leading-[1.05] text-ink sm:text-6xl">
        Your Reviews Are the Only First{" "}
        <span className="text-gradient-brand">Impression You Get.</span>
      </h2>
      <p className="mt-6 max-w-2xl leading-relaxed text-muted-foreground">
        Someone who has never heard of you judges your whole business by your star rating. Not your
        website. Not your years of experience. One unfair review can sit at the top of that list
        for years.
      </p>

      <div className="mt-12 grid gap-4 lg:grid-cols-2">
        <div className="surface animate-rise rounded-3xl p-7">
          <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Left alone
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="font-display text-5xl font-semibold text-danger">3.8</span>
            <Star className="size-6 fill-star text-star" />
          </div>
          <ul className="mt-6 space-y-3">
            {[
              "An unfair 1-star sits at the top of the list",
              "You flag it with no reasoning attached",
              "The flag is rejected with no explanation",
              "Nothing is tracked, so nothing improves",
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-3 border-b border-border pb-3 text-sm text-muted-foreground"
              >
                <span className="mt-1 text-danger">✕</span>
                {line}
              </li>
            ))}
          </ul>
        </div>

        <div className="surface animate-rise rounded-3xl border-primary/25 p-7">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            With Removal Work
          </p>
          <div className="mt-4 flex items-center gap-3">
            <span className="font-display text-5xl font-semibold text-safe">4.4</span>
            <Star className="size-6 fill-star text-star" />
          </div>
          <ul className="mt-6 space-y-3">
            {[
              "AI names the exact policy line that's broken",
              "You report with quoted evidence behind it",
              "Weak cases are flagged before you waste a report",
              "Every case tracked to a real outcome",
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-3 border-b border-border pb-3 text-sm text-foreground"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-safe" />
                {line}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Ratings shown are an illustration of the difference evidence makes, not a promise of a
        result.
      </p>
    </section>
  );
}

/* -------------------------------- problems ---------------------------------- */

const PROBLEMS = [
  {
    icon: MessageSquareQuote,
    tone: "bg-danger-soft text-danger",
    title: "Review Blackmail Is Real",
    body: "Customers threatening a 1-star unless they get a refund or a freebie. It happens far more than most owners admit, and a bare flag rarely works.",
  },
  {
    icon: ShieldCheck,
    tone: "bg-safe-soft text-safe",
    title: "You Deserve a Fair Hearing",
    body: "You spent years building a reputation. When a review genuinely breaks policy, you should be able to say exactly why — in the platform's own language.",
  },
  {
    icon: Flag,
    tone: "bg-warn-soft text-warn",
    title: "Reviews You Never Earned",
    body: "Bots, competitors and ex-employees leave reviews from people who were never customers. We help you build the case that shows it.",
  },
] as const;

export function ProblemsSection() {
  return (
    <section className="mx-auto mt-28 max-w-6xl px-3">
      <div className="grid gap-4 lg:grid-cols-3">
        {PROBLEMS.map((p, i) => (
          <div
            key={p.title}
            className="surface surface-hover animate-rise rounded-3xl p-7"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className={`flex size-12 items-center justify-center rounded-2xl ${p.tone}`}>
              <p.icon className="size-6" />
            </span>
            <p className="mt-7 font-display text-lg font-semibold text-ink">{p.title}</p>
            <p className="mt-3 leading-relaxed text-muted-foreground">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* -------------------------------- dashboard --------------------------------- */

export function DashboardSection() {
  return (
    <section className="mt-32 border-y border-border bg-card/25 py-24">
      <div className="mx-auto max-w-6xl px-3 text-center">
        <h2 className="animate-rise mx-auto max-w-3xl font-display text-4xl font-semibold leading-[1.07] text-ink sm:text-6xl">
          Every review, every case.{" "}
          <span className="text-gradient-brand">In one place.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl leading-relaxed text-muted-foreground">
          Sign in and every scan is saved as a case with a real status. Reviews, reports and
          locations stay in sync, and bulk scanning handles a whole list of links at once.
        </p>

        <div className="surface animate-rise mx-auto mt-12 max-w-3xl overflow-hidden rounded-3xl text-left">
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <div className="flex items-center gap-3">
              <BrandMark className="size-9" />
              <div>
                <p className="text-sm font-semibold text-ink">Your workspace</p>
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                  Cases · Reports · Locations
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-safe">
              <span className="status-pulse size-2 rounded-full bg-safe" />
              Live
            </span>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-3">
            {[
              { icon: MessageSquareQuote, label: "Reviews scanned", hint: "Saved with the real text" },
              { icon: Flag, label: "Reports filed", hint: "Status you control" },
              { icon: MapPin, label: "Locations", hint: "Grouped automatically" },
            ].map((tile) => (
              <div key={tile.label} className="rounded-2xl border border-border bg-background/50 p-4">
                <tile.icon className="size-5 text-primary" />
                <p className="mt-3 text-sm font-semibold text-ink">{tile.label}</p>
                <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
              </div>
            ))}
          </div>

          <div className="divide-y divide-border border-t border-border">
            {[
              { icon: Radar, title: "Bulk scanning", body: "Paste up to 25 links and watch each one move through queued, scanning and done." },
              { icon: ClipboardList, title: "Evidence on file", body: "Quoted lines, counter-evidence and the recommended action stay attached to the case." },
              { icon: TrendingUp, title: "Honest status", body: "New, reported, pending, removed, rejected or ignored. Nothing is marked resolved for you." },
            ].map((row) => (
              <div key={row.title} className="flex items-start gap-3 px-5 py-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <row.icon className="size-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{row.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{row.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="p-5">
            <Link
              to="/auth"
              className="cta-glow flex h-13 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold"
            >
              Open your dashboard
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* -------------------------------- industries -------------------------------- */

const INDUSTRIES = [
  { icon: Stethoscope, name: "Dentists & Clinics", body: "One unfair review can cost a practice years of patient trust." },
  { icon: Utensils, name: "Restaurants", body: "A single 1-star moves bookings before anyone reads the menu." },
  { icon: Car, name: "Auto Shops", body: "Customers compare ratings before they ever call for a quote." },
  { icon: Wrench, name: "Home Services", body: "Homeowners check reviews before letting anyone in the door." },
  { icon: Gavel, name: "Law Firms", body: "Credibility is judged by your profile long before the first call." },
  { icon: Store, name: "Retail & Car Washes", body: "High-volume businesses feel every fraction of a star." },
  { icon: Building2, name: "Multi-location Brands", body: "Group every case by location and see which site needs help." },
  { icon: Globe, name: "Any Local Business", body: "If you have a Google Business Profile, you can scan it today." },
] as const;

export function IndustriesSection() {
  return (
    <section className="mx-auto mt-32 max-w-6xl px-3">
      <h2 className="animate-rise font-display text-4xl font-semibold text-ink sm:text-5xl">
        Built for Local Business Owners
      </h2>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {INDUSTRIES.map((item, i) => (
          <div
            key={item.name}
            className="surface surface-hover animate-rise rounded-2xl p-5"
            style={{ animationDelay: `${i * 50}ms` }}
          >
            <item.icon className="size-5 text-primary" />
            <p className="mt-4 text-sm font-semibold text-ink">{item.name}</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------ faq ----------------------------------- */

const FAQ = [
  {
    q: "Do you remove reviews for me?",
    a: "No. No software can remove a review from Google — only the platform can. We find the policy violation, build the evidence and give you the strongest legitimate report, then track what happens.",
  },
  {
    q: "How does the AI actually check a review?",
    a: "The real review text is read against the platform's published review policies, then a second pass argues the opposite case. You get a verdict, a violation category, a confidence level, quoted evidence and the counter-evidence.",
  },
  {
    q: "Is the review data real?",
    a: "Yes. Business details, ratings and review text come from the live Google data for that listing. Google only exposes a limited subset of reviews per business, so occasionally the exact review you want isn't in that set — we tell you when that happens instead of inventing one.",
  },
  {
    q: "Do you need access to my Google Business Profile?",
    a: "Never. You only paste a public link. We never ask for your login or profile access.",
  },
  {
    q: "What if there's no violation?",
    a: "We say so plainly. A negative review that's honest is not removable, and reporting it anyway weakens your other cases.",
  },
  {
    q: "Which platforms work today?",
    a: "Google Reviews and Google Maps links are live now. Facebook, Instagram and YouTube are marked coming soon and will switch on once their access is connected.",
  },
  {
    q: "How long does a report take?",
    a: "That's entirely the platform's timeline, and it varies. Your case stays in the dashboard with an honest status until you mark the real outcome.",
  },
] as const;

export function FaqSection() {
  return (
    <section id="faq" className="mx-auto mt-32 max-w-3xl px-3">
      <h2 className="animate-rise text-center font-display text-4xl font-semibold text-ink sm:text-5xl">
        Questions We Get a Lot
      </h2>
      <p className="mt-4 text-center text-muted-foreground">Straight answers. No runaround.</p>

      <div className="mt-10 space-y-3">
        {FAQ.map((item) => (
          <details key={item.q} className="faq-item surface group rounded-2xl px-5 py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left text-base font-semibold text-ink">
              {item.q}
              <ChevronDown className="size-5 shrink-0 text-muted-foreground transition group-open:rotate-180" />
            </summary>
            <p className="mt-3 leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ---------------------------------- closing --------------------------------- */

export function ClosingSection() {
  return (
    <section className="mx-auto mt-32 max-w-6xl px-3">
      <div className="hero-shell animate-rise relative overflow-hidden rounded-3xl border border-border p-8 sm:p-14">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="font-display text-lg font-semibold text-primary">Protect Yourself Now</p>
            <h2 className="mt-3 font-display text-4xl font-semibold leading-[1.05] text-ink sm:text-[3.4rem]">
              Check Your First Review Free
            </h2>
            <p className="mt-5 max-w-md leading-relaxed text-muted-foreground">
              Paste one link and see the real review, the policy verdict and the evidence in under a
              minute. No card, no obligation.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#scan"
                className="cta-glow inline-flex h-13 items-center gap-2 rounded-xl px-6 text-sm font-semibold"
              >
                Scan a review
                <ArrowRight className="size-4" />
              </a>
              <Link
                to="/auth"
                className="inline-flex h-13 items-center gap-2 rounded-xl border border-border px-6 text-sm font-semibold text-ink transition hover:bg-muted"
              >
                Sign in
              </Link>
            </div>
            <p className="mt-5 text-sm text-muted-foreground">
              Independent tool. Not affiliated with Google. The platform always makes the final
              decision.
            </p>
          </div>

          <div className="surface rounded-3xl p-7">
            <h3 className="font-display text-xl font-semibold text-ink">What you get back</h3>
            <ul className="mt-5 space-y-3 text-sm">
              {[
                "The real business, rating and review",
                "A plain-English policy verdict",
                "Violation category and confidence",
                "Quoted evidence and counter-evidence",
                "The strongest legitimate next step",
              ].map((line) => (
                <li key={line} className="flex items-start gap-3 text-foreground">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-safe" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------- footer ---------------------------------- */

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border pt-14 pb-10">
      <div className="mx-auto grid max-w-6xl gap-10 px-3 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Wordmark />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
            AI review intelligence for local businesses. Real data, real policy checks, honest
            outcomes.
          </p>
        </div>
        <FooterCol
          title="Product"
          links={[
            { label: "Scan a review", to: "#scan" },
            { label: "How it works", to: "#how" },
            { label: "Platforms", to: "#platforms" },
            { label: "FAQ", to: "#faq" },
          ]}
        />
        <FooterCol
          title="Workspace"
          links={[
            { label: "Dashboard", to: "/dashboard" },
            { label: "Reports", to: "/reports" },
            { label: "Locations", to: "/locations" },
            { label: "Bulk scan", to: "/bulk" },
          ]}
        />
        <div>
          <p className="text-sm font-semibold text-ink">Good to know</p>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            We never request access to your business profile and never claim a review was removed.
            Reporting and removal decisions belong to the platform.
          </p>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap items-center justify-between gap-3 border-t border-border px-3 pt-6 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} Removal Work. All rights reserved.</span>
        <span>Independent tool — not affiliated with Google, Meta or YouTube.</span>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { label: string; to: string }[];
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            {l.to.startsWith("#") ? (
              <a href={l.to} className="text-muted-foreground transition hover:text-ink">
                {l.label}
              </a>
            ) : (
              <Link to={l.to} className="text-muted-foreground transition hover:text-ink">
                {l.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
