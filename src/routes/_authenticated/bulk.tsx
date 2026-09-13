import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Loader2, Minus, Search, ShieldCheck, X } from "lucide-react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { parseUrlList } from "@/lib/case-types";
import {
  createBulkJob,
  getLatestBulkJob,
  MAX_BULK_URLS,
  runBulkJobPass,
  type BulkJob,
  type BulkJobItem,
} from "@/lib/bulk.functions";

export const Route = createFileRoute("/_authenticated/bulk")({
  head: () => ({ meta: [
    { title: "Bulk review discovery — Removal Work" },
    { name: "description", content: "Queue real Google review links for verified discovery and policy analysis." },
    { property: "og:title", content: "Bulk review discovery — Removal Work" },
    { property: "og:description", content: "Queue real Google review links for verified discovery and policy analysis." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: BulkPage,
});

const STAGES = [
  ["Queued", "queued"],
  ["Discovering", "discovering"],
  ["Identified", "identified"],
  ["Analyzing", "analyzing"],
  ["Report-ready", "reportReady"],
] as const;

function BulkPage() {
  const create = useServerFn(createBulkJob);
  const getLatest = useServerFn(getLatestBulkJob);
  const runPass = useServerFn(runBulkJobPass);
  const [text, setText] = useState("");
  const [job, setJob] = useState<BulkJob | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const preview = useMemo(() => parseUrlList(text), [text]);
  const validCount = preview.filter((row) => row.valid).length;

  useEffect(() => { void getLatest().then(setJob).catch(() => undefined); }, [getLatest]);

  async function start() {
    setBusy(true);
    setError("");
    try {
      const created = await create({ data: { text, sourceKind: "competitor" } });
      setJob(await runPass({ data: { jobId: created.id } }));
      setText("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The queue could not be started.");
    } finally { setBusy(false); }
  }

  async function continuePass() {
    if (!job) return;
    setBusy(true);
    setError("");
    try { setJob(await runPass({ data: { jobId: job.id } })); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "The next pass could not run."); }
    finally { setBusy(false); }
  }

  return (
    <AppShell title="Bulk review discovery" description="Queue Google links, verify each review, then analyze only confirmed matches.">
      {job ? (
        <section className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Pipeline counts">
          {STAGES.map(([label, key]) => <div key={key} className="surface app-card"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold text-ink">{job[key]}</p></div>)}
        </section>
      ) : null}

      <div className="surface app-card">
        <label htmlFor="urls" className="text-sm font-medium text-ink">Competitor or review links</label>
        <p className="mt-1 text-sm text-muted-foreground">One real Google link per line. Up to {MAX_BULK_URLS}; duplicates are removed safely.</p>
        <textarea id="urls" rows={7} value={text} onChange={(event) => setText(event.target.value)} placeholder={"https://www.google.com/maps/place/…\nhttps://maps.app.goo.gl/…"} className="app-textarea mt-3 font-mono" />
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{preview.length === 0 ? "No links added yet." : `${validCount} valid · ${preview.length - validCount} skipped`}</p>
          <Button type="button" onClick={start} disabled={busy || validCount === 0}>{busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}{busy ? "Running first pass…" : "Queue and run first pass"}</Button>
        </div>
      </div>

      {job ? <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{job.needsReview} need review · {job.failed} failed</p>
          {job.queued > 0 ? <Button type="button" variant="outline" onClick={continuePass} disabled={busy}>{busy ? <Loader2 className="size-4 animate-spin" /> : null}Run next bounded pass</Button> : <Button asChild><Link to="/dashboard">See saved reviews</Link></Button>}
        </div>
        {job.items.map((item) => <div key={item.id} className="surface bulk-result-row grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 p-4"><StateIcon status={item.status} /><div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{item.businessName ?? item.sourceUrl}</p><p className="mt-0.5 text-sm text-muted-foreground">{item.detail}</p></div><span className="text-xs font-medium text-muted-foreground">{labelStatus(item.status)}</span></div>)}
      </div> : null}

      <p className="mt-6 text-sm text-muted-foreground">Business links can be discovered, but a review is analyzed only when Google returns one exact identity match. Removal Work never guesses which review you meant.</p>
    </AppShell>
  );
}

function labelStatus(status: BulkJobItem["status"]) { return status.replace("_", " "); }

function StateIcon({ status }: { status: BulkJobItem["status"] }) {
  const base = "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full";
  if (["discovering", "analyzing"].includes(status)) return <span className={`${base} bg-info-soft text-primary`}><Loader2 className="size-3.5 animate-spin" /></span>;
  if (status === "report_ready") return <span className={`${base} bg-safe-soft text-safe`}><ShieldCheck className="size-3.5" /></span>;
  if (status === "identified") return <span className={`${base} bg-safe-soft text-safe`}><Check className="size-3.5" /></span>;
  if (status === "failed") return <span className={`${base} bg-danger-soft text-danger`}><X className="size-3.5" /></span>;
  if (status === "needs_review") return <span className={`${base} bg-warning-soft text-warning`}><AlertTriangle className="size-3.5" /></span>;
  return <span className={`${base} bg-muted text-muted-foreground`}><Minus className="size-3.5" /></span>;
}