import { ExternalLink, Pencil, Star, Trash2, X } from "lucide-react";
import { useState } from "react";


import {
  CASE_STATUSES,
  CASE_STATUS_TRANSITIONS,
  STATUS_LABELS,
  STATUS_SHORT,
  STATUS_TONE,
  VERDICT_LABELS,
  VERDICT_TONE,
} from "@/lib/case-types";
import type { CaseRecord, CaseStatus } from "@/lib/case-types";
import { Button } from "@/components/ui/button";

const TONE_CLASS: Record<string, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-primary/25 bg-info-soft text-primary",
  warning: "border-warning/30 bg-warning-soft text-warning",
  safe: "border-safe/30 bg-safe-soft text-safe",
  danger: "border-danger/30 bg-danger-soft text-danger",
};

export function StatusBadge({ status }: { status: CaseStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[STATUS_TONE[status]]}`}
    >
      {STATUS_SHORT[status]}
    </span>
  );
}

export function VerdictBadge({ verdict }: { verdict: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[VERDICT_TONE[verdict] ?? "neutral"]}`}
    >
      {VERDICT_LABELS[verdict] ?? verdict}
    </span>
  );
}

export function CaseCard({
  item,
  onStatusChange,
  onNoteSave,
  onDelete,
  busy,
}: {
  item: CaseRecord;
  onStatusChange: (status: CaseStatus) => void;
  onNoteSave?: (note: string) => void;
  onDelete?: () => void;
  busy: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [note, setNote] = useState(item.statusNote);
  const reportable = ["strong_candidate", "possible_candidate"].includes(item.verdict);
  const availableStatuses = CASE_STATUSES.filter(
    (status) => status === item.status || CASE_STATUS_TRANSITIONS[item.status].includes(status),
  );
  return (
    <article className="surface app-card animate-rise">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 max-sm:grid-cols-1">
        <div className="min-w-0">
          <p className="font-display text-lg font-semibold text-ink">{item.locationName}</p>
          <p className="text-sm text-muted-foreground">
            {item.authorName || "Anonymous"} · {item.reviewRelativeTime || "date unknown"}
            {item.reviewRating ? (
              <span className="ml-2 inline-flex items-center gap-1 text-star">
                <Star className="size-3.5 fill-current" />
                {item.reviewRating}
              </span>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <VerdictBadge verdict={item.verdict} />
          <StatusBadge status={item.status} />
        </div>
      </div>

      <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-foreground">{item.reviewText}</p>
      <p className="mt-3 text-sm font-medium text-ink">{item.headline}</p>
      <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{item.plainSummary}</p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <label className="text-xs text-muted-foreground" htmlFor={`status-${item.id}`}>
          Status
        </label>
        <select
          id={`status-${item.id}`}
          value={item.status}
          disabled={busy}
          onChange={(event) => onStatusChange(event.target.value as CaseStatus)}
          className="app-select"
        >
          {availableStatuses.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        {item.reviewUrl ? (
          <a
            href={item.reviewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Open on Google
            <ExternalLink className="size-3.5" />
          </a>
        ) : null}
        {reportable && item.reviewUrl ? (
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => {
              window.open(item.reviewUrl, "_blank", "noopener");
            }}
          >
            Open Google reporting
          </Button>
        ) : null}
      </div>
      {reportable && item.reviewUrl ? (
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Opening Google does not confirm submission. After completing the report there, update the status yourself.
        </p>
      ) : null}

      {onNoteSave || onDelete ? (
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-3">
          {onNoteSave ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => setEditing((value) => !value)}
            >
              {editing ? <X className="size-3.5" /> : <Pencil className="size-3.5" />}
              {editing ? "Cancel" : "Edit note"}
            </Button>
          ) : null}
          {onDelete ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              className="ml-auto text-danger hover:text-danger"
              onClick={() => {
                if (window.confirm("Delete this case? This cannot be undone.")) onDelete();
              }}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          ) : null}
        </div>
      ) : null}

      {editing && onNoteSave ? (
        <div className="mt-3 space-y-2">
          <label className="text-xs text-muted-foreground" htmlFor={`note-${item.id}`}>
            Your note about this case
          </label>
          <textarea
            id={`note-${item.id}`}
            value={note}
            maxLength={500}
            rows={3}
            onChange={(event) => setNote(event.target.value)}
            className="app-input w-full resize-y"
            placeholder="What you did, or what to do next"
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
        </div>
      ) : item.statusNote ? (
        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Note: {item.statusNote}</p>
      ) : null}
    </article>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="surface app-empty-state text-center">
      <p className="font-display text-lg font-semibold text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
