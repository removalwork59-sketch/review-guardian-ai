import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/app-shell";
import { CaseCard, EmptyState } from "@/components/case-ui";
import { useCases, useStatusMutation } from "./dashboard";

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
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Reported" value={counts.reported} />
        <Stat label="Waiting on Google" value={counts.pending} />
        <Stat label="Removed" value={counts.removed} tone="text-safe" />
        <Stat label="Google said no" value={counts.rejected} tone="text-danger" />
      </div>

      <section className="mt-8">
        <h2 className="font-display text-xl font-semibold text-ink">Ready to report</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The AI found a case worth making. Open the review on Google, flag it there, then mark it
          reported here.
        </p>
        <div className="mt-4 grid gap-4">
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

      <section className="mt-10">
        <h2 className="font-display text-xl font-semibold text-ink">Being tracked</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Google decides the outcome — update the status here when you hear back.
        </p>
        <div className="mt-4 grid gap-4">
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

function Stat({ label, value, tone = "text-ink" }: { label: string; value: number; tone?: string }) {
  return (
    <div className="surface p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  );
}
