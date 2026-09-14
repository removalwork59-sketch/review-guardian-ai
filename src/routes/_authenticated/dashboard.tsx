import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { AppShell } from "@/components/app-shell";
import { CaseCard, EmptyState } from "@/components/case-ui";
import { deleteCase, listCases, updateCaseStatus } from "@/lib/cases.functions";
import type { CaseRecord, CaseStatus } from "@/lib/case-types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Reviews — Removal Work" },
      { name: "description", content: "Every review you've checked, with its result and status." },
      { property: "og:title", content: "Reviews — Removal Work" },
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
    mutationFn: (input: { id: string; status: CaseStatus; note?: string }) => update({ data: input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cases"] });
      void queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

export function useDeleteCaseMutation() {
  const queryClient = useQueryClient();
  const remove = useServerFn(deleteCase);
  return useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["cases"] });
      void queryClient.invalidateQueries({ queryKey: ["locations"] });
    },
  });
}

function ReviewsPage() {
  const { data, isPending, error } = useCases();
  const status = useStatusMutation();
  const removeCase = useDeleteCaseMutation();
  const [filter, setFilter] = useState<string>("all");

  const cases: CaseRecord[] = data ?? [];
  const shown = filter === "all" ? cases : cases.filter((item) => item.verdict === filter);

  return (
    <AppShell
      title="Reviews"
      description="Every review you've checked, newest first."
      actions={
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href="/#scan">Add review</a>
          </Button>
          <Button asChild variant="outline">
            <Link to="/scans">Scan reports</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/bulk">Bulk scan</Link>
          </Button>
        </div>
      }
    >
      <div className="app-filter-row">
        {FILTERS.map((item) => (
          <Button
            key={item.id}
            type="button"
            onClick={() => setFilter(item.id)}
            variant="outline"
            size="sm"
            className={`rounded-full ${
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
          </Button>
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
        <div className="app-list-grid">
          {shown.map((item) => (
            <CaseCard
              key={item.id}
              item={item}
              busy={status.isPending || removeCase.isPending}
              onStatusChange={(next) => status.mutate({ id: item.id, status: next })}
              onNoteSave={(note) => status.mutate({ id: item.id, status: item.status, note })}
              onDelete={() => removeCase.mutate(item.id)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}
