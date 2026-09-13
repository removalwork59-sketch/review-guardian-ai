import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, Minus, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { VerdictBadge } from "@/components/case-ui";
import { parseUrlList } from "@/lib/case-types";
import { scanAndSaveUrl } from "@/lib/bulk.functions";

export const Route = createFileRoute("/_authenticated/bulk")({
  head: () => ({
    meta: [
      { title: "Bulk scan — Removal Work" },
      { name: "description", content: "Paste many review links and check them all in one go." },
      { property: "og:title", content: "Bulk scan — Removal Work" },
      {
        property: "og:description",
        content: "Paste many review links and check them all in one go.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BulkPage,
});

type RowState = "queued" | "skipped" | "running" | "done" | "failed";

type Row = {
  url: string;
  valid: boolean;
  reason: string;
  state: RowState;
  detail: string;
  verdict?: string;
};

const MAX_URLS = 25;

function BulkPage() {
  const run = useServerFn(scanAndSaveUrl);
  const queryClient = useQueryClient();

  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [running, setRunning] = useState(false);

  const preview = useMemo(() => parseUrlList(text), [text]);
  const validCount = preview.filter((row) => row.valid).length;
  const overLimit = validCount > MAX_URLS;

  async function start() {
    const initial: Row[] = preview.map((row) => ({
      ...row,
      state: row.valid ? "queued" : "skipped",
      detail: row.valid ? "Waiting" : row.reason,
    }));
    setRows(initial);
    setRunning(true);

    const queue = initial
      .map((row, index) => ({ row, index }))
      .filter((item) => item.row.state === "queued")
      .slice(0, MAX_URLS);

    const patch = (index: number, next: Partial<Row>) =>
      setRows((current) =>
        current ? current.map((row, i) => (i === index ? { ...row, ...next } : row)) : current,
      );

    let cursor = 0;
    async function worker() {
      while (cursor < queue.length) {
        const item = queue[cursor++]!;
        patch(item.index, { state: "running", detail: "Scanning and checking…" });
        try {
          const result = await run({ data: { url: item.row.url } });
          if (result.ok) {
            patch(item.index, {
              state: "done",
              verdict: result.case.verdict,
              detail: `${result.businessName} — ${result.case.headline}`,
            });
          } else {
            patch(item.index, { state: "failed", detail: `${result.message} ${result.hint}` });
          }
        } catch {
          patch(item.index, { state: "failed", detail: "This link couldn't be checked." });
        }
      }
    }

    await Promise.all([worker(), worker()]);
    setRunning(false);
    void queryClient.invalidateQueries({ queryKey: ["cases"] });
    void queryClient.invalidateQueries({ queryKey: ["locations"] });
  }

  const finished = rows !== null && !running;

  return (
    <AppShell
      title="Bulk scan"
      description="Paste a list of Google review links — we check them one by one and save each result."
      actions={
        finished ? (
          <Link
            to="/dashboard"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:brightness-110"
          >
            See all results
          </Link>
        ) : null
      }
    >
      <div className="surface p-5">
        <label htmlFor="urls" className="text-sm font-medium text-ink">
          Review links
        </label>
        <p className="mt-1 text-sm text-muted-foreground">
          One per line. Up to {MAX_URLS} links at a time.
        </p>
        <textarea
          id="urls"
          rows={7}
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={"https://www.google.com/maps/place/…\nhttps://maps.app.goo.gl/…"}
          className="mt-3 w-full resize-y rounded-2xl border border-border bg-card px-4 py-3 font-mono text-sm text-ink outline-none focus:border-primary"
        />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {preview.length === 0
              ? "Nothing pasted yet."
              : `${validCount} ready · ${preview.length - validCount} can't be used`}
            {overLimit ? ` · only the first ${MAX_URLS} will run` : ""}
          </p>
          <button
            type="button"
            onClick={start}
            disabled={running || validCount === 0}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:brightness-110 disabled:opacity-60"
          >
            {running ? <Loader2 className="size-4 animate-spin" /> : null}
            {running ? "Checking…" : `Check ${Math.min(validCount, MAX_URLS) || ""} links`.trim()}
          </button>
        </div>
      </div>

      {rows ? (
        <div className="mt-6 grid gap-2">
          {rows.map((row, index) => (
            <div key={`${row.url}-${index}`} className="surface flex items-start gap-3 p-4">
              <StateIcon state={row.state} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{row.url}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{row.detail}</p>
              </div>
              {row.verdict ? <VerdictBadge verdict={row.verdict} /> : null}
            </div>
          ))}
        </div>
      ) : null}

      <p className="mt-6 text-sm text-muted-foreground">
        For each business we check the review most likely to be a problem — the lowest-rated one
        Google shares. Google only shares a handful of reviews per business, so this is a sample,
        not the full history.
      </p>
    </AppShell>
  );
}

function StateIcon({ state }: { state: RowState }) {
  const base = "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full";
  if (state === "running")
    return (
      <span className={`${base} bg-info-soft text-primary`}>
        <Loader2 className="size-3.5 animate-spin" />
      </span>
    );
  if (state === "done")
    return (
      <span className={`${base} bg-safe-soft text-safe`}>
        <Check className="size-3.5" />
      </span>
    );
  if (state === "failed")
    return (
      <span className={`${base} bg-danger-soft text-danger`}>
        <X className="size-3.5" />
      </span>
    );
  if (state === "skipped")
    return (
      <span className={`${base} bg-warning-soft text-warning`}>
        <AlertTriangle className="size-3.5" />
      </span>
    );
  return (
    <span className={`${base} bg-muted text-muted-foreground`}>
      <Minus className="size-3.5" />
    </span>
  );
}
