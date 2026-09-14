import { createFileRoute } from "@tanstack/react-router";

import { CaseCard, EmptyState, ErrorState, LoadingState } from "@/components/case-ui";
import { StatTile } from "@/components/ui/stat-tile";
import { WorkspaceShell } from "@/components/workspace-shell";
import { useCases } from "@/hooks/use-cases";

export const Route = createFileRoute("/app/reports")({
  head: () => ({ meta: [{ title: "Reports — Removal Work" }] }),
  component: ReportsPage,
});

const IN_PROGRESS = [
  "submitted",
  "processing",
  "decision",
  "escalated",
  "appeal_available",
  "appeal_submitted",
  "appeal_result",
];

function ReportsPage() {
  const cases = useCases();
  const all = (cases.data ?? []).filter((item) => !item.dismissed);

  const ready = all.filter(
    (item) =>
      (item.report && ["draft", "ready"].includes(item.report.status)) ||
      (!item.report && item.decision === "reportable"),
  );
  const tracking = all.filter((item) => item.report && IN_PROGRESS.includes(item.report.status));
  const outcomes = all.filter(
    (item) => item.report && ["removed", "not_removed"].includes(item.report.status),
  );

  return (
    <WorkspaceShell
      title="Reports"
      description="What's ready to report, what Google is reviewing, and the real outcomes."
    >
      {cases.isPending ? (
        <LoadingState label="Loading reports…" />
      ) : cases.error ? (
        <ErrorState
          body="We couldn't load your reports."
          error={cases.error}
          onRetry={() => void cases.refetch()}
        />
      ) : (
        <>
          <dl className="app-stats-grid mb-6">
            <StatTile label="Ready to report" value={ready.length} />
            <StatTile label="With Google" value={tracking.length} />
            <StatTile
              label="Removed by Google"
              value={outcomes.filter((item) => item.report?.status === "removed").length}
              tone="text-safe"
            />
            <StatTile
              label="Google kept it"
              value={outcomes.filter((item) => item.report?.status === "not_removed").length}
              tone="text-danger"
            />
          </dl>
          <Section
            title="Ready to report"
            empty="Nothing waiting. When a scan finds a real policy problem, it shows up here."
            items={ready}
          />
          <Section title="With Google" empty="Nothing reported yet." items={tracking} />
          <Section
            title="Outcomes"
            empty="No decisions from Google recorded yet."
            items={outcomes}
          />
        </>
      )}
    </WorkspaceShell>
  );
}

function Section({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: ReturnType<typeof useCases>["data"];
}) {
  return (
    <section className="mb-8">
      <h2 className="rw-section-title">{title}</h2>
      {items && items.length ? (
        <div className="rw-card-grid">
          {items.map((item) => (
            <CaseCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState title={title} body={empty} />
      )}
    </section>
  );
}
