import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Pencil, Star, Trash2, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { EmptyState, VERDICT_META } from "@/components/case-ui";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS } from "@/lib/analysis-types";
import type { CaseRecord, CaseStatus } from "@/lib/case-types";
import {
  useCases,
  useDeleteCaseMutation,
  useStatusMutation,
} from "@/routes/_authenticated/dashboard";

export const Route = createFileRoute("/_authenticated/scans")({
  head: () => ({
    meta: [
      { title: "Scan reports — Removal Work" },
      {
        name: "description",
        content: "Full AI policy scan reports for every review you've checked.",
      },
      { property: "og:title", content: "Scan reports — Removal Work" },
      {
        property: "og:description",
        content: "Full AI policy scan reports for every review you've checked.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ScansPage,
});

const STATUS_OPTIONS: { value: CaseStatus; label: string }[] = [
  { value: "new", label: "New" },
  { value: "reported", label: "I reported it" },
  { value: "pending", label: "Awaiting outcome" },
  { value: "removed", label: "Confirmed removed" },
  { value: "rejected", label: "Kept by Google" },
  { value: "ignored", label: "Ignore" },
];

function EvidenceList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "for" | "against";
}) {
  if (!items.length) return null;
  return (
    <div
      className={`rounded-2xl border p-4 ${
        tone === "for"
          ? "border-warning/30 bg-warning-soft/40"
          : "border-border bg-info-soft/30"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
        {items.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function ScanReportCard({
  item,
  busy,
  onStatusChange,
  onNoteSave,
  onDelete,
}: {
  item: CaseRecord;
  busy: boolean;
  onStatusChange: (status: CaseStatus) => void;
  onNoteSave: (note: string) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [note, setNote] = useState(item.statusNote);
  const verdict = VERDICT_META[item.verdict] ?? {
    label: item.verdict,
    className: "bg-muted text-muted-foreground",
  };
  const analysis = item.analysis;

  return (
    <article className="app-card app-data-card">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {item.locationName}
          </p>
          <h3 className="mt-1 text-base font-bold text-ink">{item.headline}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{item.plainSummary}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${verdict.className}`}
        >
          {verdict.label}
        </span>
      </header>

      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full bg-muted px-2.5 py-1">
          Confidence {item.confidence}%
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 capitalize">
          {item.severity} severity
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1">
          {CATEGORY_LABELS[item.violationCategory] ?? item.violationCategory}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1 capitalize">
          Rejection risk: {item.rejectionRisk}
        </span>
        <span className="rounded-full bg-muted px-2.5 py-1">
          {new Date(item.createdAt).toLocaleDateString()}
        </span>
      </div>

      <blockquote className="rounded-2xl border border-border bg-muted/40 p-4 text-sm text-ink">
        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {item.authorName}
          {item.reviewRating !== null ? (
            <span className="inline-flex items-center gap-1 text-warning">
              <Star className="h-3.5 w-3.5 fill-current" />
              {item.reviewRating}/5
            </span>
          ) : null}
          <span>· {item.reviewRelativeTime}</span>
        </p>
        <p className="mt-2 break-words">{item.reviewText}</p>
      </blockquote>

      {analysis ? (
        <>
          {analysis.recommendedAction ? (
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-ink">Recommended: </span>
              {analysis.recommendedAction}
            </p>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <EvidenceList title="Evidence" items={analysis.evidence} tone="for" />
            <EvidenceList
              title="Counter-evidence"
              items={analysis.counterEvidence}
              tone="against"
            />
          </div>
          {analysis.challenge ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold">Second opinion: </span>
              {analysis.challenge}
            </p>
          ) : null}
        </>
      ) : null}

      {item.statusNote ? (
        <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
          <span className="font-semibold text-ink">Note: </span>
          {item.statusNote}
        </p>
      ) : null}

      <footer className="flex flex-wrap items-center gap-2">
        <select
          aria-label="Change status"
          className="app-input w-auto min-w-40 text-xs"
          value={item.status}
          disabled={busy}
          onChange={(event) => onStatusChange(event.target.value as CaseStatus)}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {item.reviewUrl ? (
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <a href={item.reviewUrl} target="_blank" rel="noopener noreferrer">
              View review <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        ) : null}
        {editing ? (
          <div className="flex w-full flex-wrap items-center gap-2">
            <input
              aria-label="Case note"
              className="app-input min-w-0 flex-1 text-xs"
              value={note}
              maxLength={500}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Add a note (e.g. what Google replied)"
            />
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => {
                onNoteSave(note);
                setEditing(false);
              }}
            >
              Save note
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setNote(item.statusNote);
                setEditing(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setEditing(true)}
          >
            <Pencil className="h-3.5 w-3.5" /> Edit note
          </Button>
        )}
        {confirming ? (
          <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            Delete this scan permanently?
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={busy}
              onClick={onDelete}
            >
              Yes, delete
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setConfirming(false)}
            >
              Keep
            </Button>
          </span>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-danger"
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete
          </Button>
        )}
      </footer>
    </article>
  );
}

function ScansPage() {
  const { data, isPending, error } = useCases();
  const status = useStatusMutation();
  const removeCase = useDeleteCaseMutation();
  const cases = data ?? [];

  return (
    <AppShell
      title="Scan reports"
      description="The full AI policy report for every review you've scanned — evidence, verdict and status in one place."
      actions={
        <Button asChild>
          <a href="/#scan">New scan</a>
        </Button>
      }
    >
      {isPending ? (
        <EmptyState title="Loading your scan reports…" body="One moment." />
      ) : error ? (
        <EmptyState
          title="We couldn't load your scan reports"
          body="Please refresh the page and try again."
        />
      ) : cases.length === 0 ? (
        <EmptyState
          title="No scans yet"
          body="Run a scan from the home page and its full report will appear here."
        />
      ) : (
        <div className="grid gap-4">
          {cases.map((item) => (
            <ScanReportCard
              key={item.id}
              item={item}
              busy={status.isPending || removeCase.isPending}
              onStatusChange={(next) => status.mutate({ id: item.id, status: next })}
              onNoteSave={(note) =>
                status.mutate({ id: item.id, status: item.status, note })
              }
              onDelete={() => removeCase.mutate(item.id)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
