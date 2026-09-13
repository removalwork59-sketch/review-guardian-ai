import {
  AlertTriangle,
  ArrowLeft,
  ClipboardList,
  Eye,
  Flag,
  Scale,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { CATEGORY_LABELS, type ReviewAnalysis } from "@/lib/analysis-types";
import { Button } from "@/components/ui/button";

const VERDICTS: Record<
  ReviewAnalysis["verdict"],
  { label: string; tone: "danger" | "warn" | "info" | "safe" }
> = {
  strong_candidate: { label: "Strong case to report", tone: "danger" },
  possible_candidate: { label: "Possible policy problem", tone: "warn" },
  needs_human_review: { label: "Needs your judgement", tone: "info" },
  not_reportable: { label: "No clear policy violation", tone: "safe" },
};

const TONE_CLASSES = {
  danger: "bg-danger-soft text-danger border-danger/25",
  warn: "bg-warn-soft text-warn border-warn/25",
  info: "bg-info-soft text-info border-info/25",
  safe: "bg-safe-soft text-safe border-safe/25",
} as const;

function Section({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-ink">
        {icon}
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, index) => (
          <li
            key={item}
            className="animate-rise rounded-xl border border-border bg-muted/40 px-3.5 py-2.5 text-sm leading-relaxed text-foreground"
            style={{ animationDelay: `${index * 70}ms` }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AnalysisPanel({
  analysis,
  onBack,
  onReport,
  identityVerified,
}: {
  analysis: ReviewAnalysis;
  onBack: () => void;
  onReport: () => void;
  identityVerified: boolean;
}) {
  const verdict = VERDICTS[analysis.verdict];
  const reportable = ["strong_candidate", "possible_candidate"].includes(analysis.verdict);
  const canReport = reportable && identityVerified;

  return (
    <div className="animate-rise space-y-6">
      <div className={`surface overflow-hidden`}>
        <div className={`flex items-start gap-3 border-b px-5 py-4 sm:px-6 ${TONE_CLASSES[verdict.tone]}`}>
          {verdict.tone === "safe" ? (
            <ShieldCheck className="mt-0.5 size-5 shrink-0" />
          ) : (
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
          )}
          <div>
            <p className="text-sm font-semibold">{verdict.label}</p>
            <p className="mt-0.5 text-sm opacity-90">{analysis.headline}</p>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-6">
          <p className="text-[15px] leading-relaxed text-foreground">{analysis.plainSummary}</p>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Problem type" value={CATEGORY_LABELS[analysis.violationCategory] ?? "—"} />
            <Stat label="How sure the AI is" value={`${analysis.confidence}%`} />
            <Stat label="How serious" value={capitalize(analysis.severity)} />
            {reportable ? (
              <Stat label="Chance Google says no" value={capitalize(analysis.rejectionRisk)} />
            ) : (
              <Stat label="Action needed" value="None" />
            )}
          </dl>

          <Section
            icon={<ClipboardList className="size-4 text-primary" />}
            title="What supports reporting it"
            items={analysis.evidence}
          />
          <Section
            icon={<Scale className="size-4 text-primary" />}
            title="What argues against it"
            items={analysis.counterEvidence}
          />
          <Section
            icon={<Eye className="size-4 text-primary" />}
            title="What we still don't know"
            items={analysis.missingEvidence}
          />

          <div className="rounded-xl border border-border bg-muted/40 p-4">
            <p className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-ink">
              <Sparkles className="size-4 text-primary" />
              The AI argued the other side
            </p>
            <p className="text-sm leading-relaxed text-muted-foreground">{analysis.challenge}</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <p className="mb-1.5 text-sm font-semibold text-ink">What to do next</p>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {analysis.recommendedAction}
            </p>
            {reportable ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Reason to give Google: {analysis.recommendedReportReason}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row-reverse sm:items-center sm:justify-between">
        {canReport ? (
          <Button
            type="button"
            onClick={onReport}
            className="h-12 w-full px-6 text-base sm:w-auto"
          >
            <Flag className="size-4.5" />
            Report on Google
          </Button>
        ) : reportable ? (
          <p className="text-sm text-muted-foreground sm:text-right">Confirm the exact review identity before opening Google’s report flow.</p>
        ) : (
          <p className="text-sm text-muted-foreground sm:text-right">
            Nothing to report here — this one looks like a genuine opinion.
          </p>
        )}
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Check a different review
        </Button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-muted/40 px-3.5 py-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-ink">{value}</dd>
    </div>
  );
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
