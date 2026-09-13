import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CaseCard, EmptyState } from "@/components/case-ui";
import { listCases, updateCaseStatus } from "@/lib/cases.functions";
import type { CaseRecord, CaseStatus } from "@/lib/case-types";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Reviews — Review Shield" },
      { name: "description", content: "Every review you've checked, with its result and status." },
      { property: "og:title", content: "Reviews — Review Shield" },
      {
        property: "og:description",
        content: "Every review you've checked, with its result and status.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewsPage,
});

const FILTERS = [
  { id: "all", label: "All" },
  { id: "strong_candidate", label: "Strong cases" },
  { id: "possible_candidate", label: "Possible" },
  { id: "needs_human_review", label: "Needs your eyes" },
  { id: "not_reportable", label: "No violation" },
] as const;

export function useCases() {
  const fetchCases = useServerFn(listCases);
  return useQuery({ queryKey: ["cases"], queryFn: () => fetchCases({ data: undefined }) });
}

export function useStatusMutation() {
  const queryClient = useQueryClient();
  const update = useServerFn(updateCaseStatus);
  return useMutation({
    mutationFn: (input: { id: string; status: CaseStatus }) => update({ data: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cases"] });
      void queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

function ReviewsPage() {
  const { data, isPending, error } = useCases();
  const status = useStatusMutation();
  const [filter, setFilter] = useState<string>("all");

  const cases: CaseRecord[] = data ?? [];
  const shown = filter === "all" ? cases : cases.filter((item) => item.verdict === filter);

  return (
    <AppShell
      title="Reviews"
      description="Every review you've checked, newest first."
      actions={
        <Link
          to="/bulk"
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-soft transition hover:brightness-110"
        >
          Bulk scan
        </Link>
      }
    >
      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition ${
              filter === item.id
                ? "border-primary bg-info-soft text-primary"
                : "border-border bg-card text-muted-foreground hover:text-ink"
            }`}
          >
            {item.label}
            {item.id !== "all" ? (
              <span className="ml-1.5 text-xs opacity-70">
                {cases.filter((c) => c.verdict === item.id).length}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {isPending ? (
        <EmptyState title="Loading your reviews…" body="One moment." />
      ) : error ? (
        <EmptyState
          title="We couldn't load your reviews"
          body="Please refresh the page and try again."
        />
      ) : shown.length === 0 ? (
        <EmptyState
          title={cases.length === 0 ? "No reviews checked yet" : "Nothing in this filter"}
          body={
            cases.length === 0
              ? "Scan a review link on the home page, or paste a whole list on the bulk scan screen."
              : "Try another filter to see your other results."
          }
        />
      ) : (
        <div className="grid gap-4">
          {shown.map((item) => (
            <CaseCard
              key={item.id}
              item={item}
              busy={status.isPending}
              onStatusChange={(next) => status.mutate({ id: item.id, status: next })}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
