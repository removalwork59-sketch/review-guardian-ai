import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { EmptyState } from "@/components/case-ui";
import { StatTile } from "@/components/ui/stat-tile";
import { Button } from "@/components/ui/button";
import { listCases, updateCaseStatus } from "@/lib/cases.functions";
import {
  CASE_STATUS_TRANSITIONS,
  STATUS_SHORT,
  VERDICT_LABELS,
  type CaseRecord,
  type CaseStatus,
} from "@/lib/case-types";

export const Route = createFileRoute("/_authenticated/pipeline")({
  head: () => ({
    meta: [
      { title: "Case pipeline — Removal Work" },
      {
        name: "description",
        content: "Track pending, identified and reported review cases and act on many at once.",
      },
      { property: "og:title", content: "Case pipeline — Removal Work" },
      {
        property: "og:description",
        content: "Track pending, identified and reported review cases and act on many at once.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PipelinePage,
});

type Stage = "all" | "pending" | "identified" | "reported" | "resolved";

const STAGES: { id: Stage; label: string }[] = [
  { id: "all", label: "All cases" },
  { id: "pending", label: "Pending" },
  { id: "identified", label: "Identified" },
  { id: "reported", label: "Reported" },
  { id: "resolved", label: "Resolved" },
];

function stageOf(item: CaseRecord): Exclude<Stage, "all"> {
  if (item.status === "removed" || item.status === "rejected") return "resolved";
  if (item.status === "reported" || item.status === "pending") return "reported";
  if (item.verdict === "strong_candidate" || item.verdict === "possible_candidate") {
    return "identified";
  }
  return "pending";
}

const BULK_ACTIONS: { status: CaseStatus; label: string }[] = [
  { status: "reported", label: "Mark reported" },
  { status: "pending", label: "Mark waiting" },
  { status: "removed", label: "Mark removed" },
  { status: "ignored", label: "Leave alone" },
];

function PipelinePage() {
  const fetchCases = useServerFn(listCases);
  const update = useServerFn(updateCaseStatus);
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: ["cases"],
    queryFn: () => fetchCases({ data: undefined }),
  });

  const cases: CaseRecord[] = useMemo(() => data ?? [], [data]);
  const [stage, setStage] = useState<Stage>("all");
  const [category, setCategory] = useState("all");
  const [competitor, setCompetitor] = useState("all");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const categories = useMemo(
    () => Array.from(new Set(cases.map((c) => c.violationCategory).filter(Boolean))).sort(),
    [cases],
  );
  const competitors = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of cases) map.set(c.locationId, c.locationName);
    return Array.from(map, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [cases]);

  const shown = cases.filter(
    (item) =>
      (stage === "all" || stageOf(item) === stage) &&
      (category === "all" || item.violationCategory === category) &&
      (competitor === "all" || item.locationId === competitor),
  );

  const counts = {
    pending: cases.filter((c) => stageOf(c) === "pending").length,
    identified: cases.filter((c) => stageOf(c) === "identified").length,
    reported: cases.filter((c) => stageOf(c) === "reported").length,
    resolved: cases.filter((c) => stageOf(c) === "resolved").length,
  };

  const selectedCases = shown.filter((item) => selected.includes(item.id));

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function runBulk(next: CaseStatus) {
    const eligible = selectedCases.filter(
      (item) => item.status === next || CASE_STATUS_TRANSITIONS[item.status].includes(next),
    );
    if (eligible.length === 0) {
      toast.error("None of the selected cases can move to that stage right now.");
      return;
    }
    setBusy(true);
    let done = 0;
    let failed = 0;
    for (const item of eligible) {
      try {
        await update({ data: { id: item.id, status: next } });
        done += 1;
      } catch {
        failed += 1;
      }
    }
    setBusy(false);
    setSelected([]);
    await queryClient.invalidateQueries({ queryKey: ["cases"] });
    await queryClient.invalidateQueries({ queryKey: ["locations"] });
    const skipped = selectedCases.length - eligible.length;
    toast.success(`${done} case${done === 1 ? "" : "s"} updated`, {
      description: [
        skipped ? `${skipped} skipped (not allowed from their current stage)` : "",
        failed ? `${failed} failed` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    });
  }

  return (
    <AppShell
      title="Case pipeline"
      description="Where every review case stands, and act on a whole batch at once."
      actions={
        <Button asChild variant="outline">
          <Link to="/bulk">Bulk scan</Link>
        </Button>
      }
    >
      <dl className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Pending" value={counts.pending} />
        <StatTile label="Identified" value={counts.identified} tone="text-warning" />
        <StatTile label="Reported" value={counts.reported} tone="text-primary" />
        <StatTile label="Resolved" value={counts.resolved} tone="text-safe" />
      </dl>

      <div className="app-filter-row">
        {STAGES.map((item) => (
          <Button
            key={item.id}
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              setStage(item.id);
              setSelected([]);
            }}
            className={`rounded-full ${
              stage === item.id
                ? "border-primary bg-info-soft text-primary"
                : "border-border bg-card text-muted-foreground hover:text-ink"
            }`}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3">
        <label className="text-sm text-muted-foreground">
          <span className="mr-2">Category</span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1.5 text-sm text-ink"
          >
            <option value="all">All categories</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {value.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm text-muted-foreground">
          <span className="mr-2">Business</span>
          <select
            value={competitor}
            onChange={(event) => setCompetitor(event.target.value)}
            className="rounded-md border border-border bg-card px-2 py-1.5 text-sm text-ink"
          >
            <option value="all">All businesses</option>
            {competitors.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selected.length > 0 ? (
        <div className="surface mt-4 flex flex-wrap items-center gap-2 p-4">
          <p className="mr-auto text-sm font-medium text-ink">
            {selected.length} selected
            {busy ? <Loader2 className="ml-2 inline size-4 animate-spin" /> : null}
          </p>
          {BULK_ACTIONS.map((action) => (
            <Button
              key={action.status}
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => void runBulk(action.status)}
            >
              {action.label}
            </Button>
          ))}
          <Button type="button" size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear
          </Button>
        </div>
      ) : null}

      {isPending ? (
        <EmptyState title="Loading your cases…" body="One moment." />
      ) : shown.length === 0 ? (
        <EmptyState
          title={cases.length === 0 ? "No cases yet" : "Nothing matches these filters"}
          body={
            cases.length === 0
              ? "Scan a review link, or paste a list on the bulk scan screen."
              : "Try another stage, category or business."
          }
        />
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {shown.map((item) => (
            <article
              key={item.id}
              className="surface flex flex-wrap items-start gap-3 p-4"
            >
              <input
                type="checkbox"
                aria-label={`Select case for ${item.locationName}`}
                checked={selected.includes(item.id)}
                onChange={() => toggle(item.id)}
                className="mt-1 size-4 accent-[hsl(var(--primary))]"
              />
              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-semibold text-ink">{item.headline}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {item.locationName}
                  {item.violationCategory ? ` · ${item.violationCategory.replaceAll("_", " ")}` : ""}
                  {` · ${VERDICT_LABELS[item.verdict] ?? item.verdict}`}
                </p>
              </div>
              <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted-foreground">
                {STATUS_SHORT[item.status]}
              </span>
            </article>
          ))}
        </div>
      )}
    </AppShell>
  );
}
