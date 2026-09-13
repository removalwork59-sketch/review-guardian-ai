import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { CaseCard, EmptyState } from "@/components/case-ui";
import { useCases, useStatusMutation } from "./dashboard";
import { StatTile } from "@/components/ui/stat-tile";

export const Route = createFileRoute("/_authenticated/reports")({
  head: () => ({
    meta: [
      { title: "Reports — Removal Work" },
      {
        name: "description",
        content: "Track what you reported to Google and what actually happened.",
      },
      { property: "og:title", content: "Reports — Removal Work" },
      {
        property: "og:description",
        content: "Track what you reported to Google and what actually happened.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data, isPending } = useCases();
  const status = useStatusMutation();

  const cases = data ?? [];
  const ready = cases.filter(
    (item) =>
      item.status === "new" &&
      (item.verdict === "strong_candidate" || item.verdict === "possible_candidate"),
  );
  const tracked = cases.filter((item) => item.status !== "new" && item.status !== "ignored");

  const counts = {
    reported: cases.filter((item) => item.status === "reported").length,
    pending: cases.filter((item) => item.status === "pending").length,
    removed: cases.filter((item) => item.status === "removed").length,
    rejected: cases.filter((item) => item.status === "rejected").length,
  };

  return (
    <AppShell
      title="Reports"
      description="What you've flagged to Google, and where each one stands."
    >
      <dl className="app-stats-grid">
        <StatTile label="Reported" value={counts.reported} />
        <StatTile label="Waiting on Google" value={counts.pending} />
        <StatTile label="Removed" value={counts.removed} tone="text-safe" />
        <StatTile label="Google said no" value={counts.rejected} tone="text-danger" />
      </dl>

      <section className="app-section">
        <h2 className="app-section-title">Ready to report</h2>
        <p className="app-section-description">
          The AI found a case worth making. Open the review on Google, flag it there, then mark it
          reported here.
        </p>
        <div className="app-section-list app-list-grid">
          {isPending ? (
            <EmptyState title="Loading…" body="One moment." />
          ) : ready.length === 0 ? (
            <EmptyState
              title="Nothing waiting to be reported"
              body="When a scan finds a review worth flagging, it shows up here."
            />
          ) : (
            ready.map((item) => (
              <CaseCard
                key={item.id}
                item={item}
                busy={status.isPending}
                onStatusChange={(next) => status.mutate({ id: item.id, status: next })}
              />
            ))
          )}
        </div>
      </section>

      <section className="app-section">
        <h2 className="app-section-title">Being tracked</h2>
        <p className="app-section-description">
          Google decides the outcome — update the status here when you hear back.
        </p>
        <div className="app-section-list app-list-grid">
          {tracked.length === 0 ? (
            <EmptyState
              title="Nothing reported yet"
              body="Once you mark a review as reported, you can follow it here."
            />
          ) : (
            tracked.map((item) => (
              <CaseCard
                key={item.id}
                item={item}
                busy={status.isPending}
                onStatusChange={(next) => status.mutate({ id: item.id, status: next })}
              />
            ))
          )}
        </div>
      </section>
    </AppShell>
  );
}
