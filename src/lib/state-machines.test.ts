import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  canTransitionJob,
  canTransitionReport,
  GOOGLE_DECISION_SOURCES,
  nextReportStatuses,
  REPORT_STATUSES,
  REVIEW_JOB_STATUSES,
} from "@/lib/state-machines";
import type { ReportStatus, ReviewJobStatus } from "@/lib/state-machines";

const migration = readFileSync(
  fileURLToPath(
    new URL("../../supabase/migrations/20260913200000_removal_work_schema.sql", import.meta.url),
  ),
  "utf8",
);

function sqlPairs(functionName: string) {
  const start = migration.indexOf(`FUNCTION public.${functionName}`);
  const body = migration.slice(start, migration.indexOf("$$;", start));
  return [...body.matchAll(/\('([a-z_]+)', '([a-z_]+)'\)/g)].map(
    (match) => [match[1], match[2]] as const,
  );
}

describe("review job state machine", () => {
  it("follows the pipeline order", () => {
    expect(canTransitionJob("queued", "discovering")).toBe(true);
    expect(canTransitionJob("discovering", "awaiting_selection")).toBe(true);
    expect(canTransitionJob("awaiting_selection", "identified")).toBe(true);
    expect(canTransitionJob("identified", "analyzing")).toBe(true);
    expect(canTransitionJob("analyzing", "evidence_ready")).toBe(true);
    expect(canTransitionJob("evidence_ready", "report_ready")).toBe(true);
  });

  it("refuses to skip steps or restart finished work", () => {
    expect(canTransitionJob("discovering", "completed")).toBe(false);
    expect(canTransitionJob("queued", "report_ready")).toBe(false);
    expect(canTransitionJob("completed", "failed")).toBe(false);
    expect(canTransitionJob("cancelled", "queued")).toBe(false);
  });

  it("lets any unfinished step fail, and failed work be retried", () => {
    expect(canTransitionJob("analyzing", "failed")).toBe(true);
    expect(canTransitionJob("failed", "queued")).toBe(true);
  });

  it("matches the transitions the database enforces", () => {
    // The SQL also has a generic "any unfinished job may fail or be cancelled" rule, written as
    // `_to IN ('failed', 'cancelled')`; those are checked separately below, not as pairs.
    const pairs = sqlPairs("review_job_transition_allowed").filter(
      ([, to]) => to !== "failed" && to !== "cancelled",
    );
    expect(pairs.length).toBeGreaterThan(10);
    expect(migration).toContain(
      "_to IN ('failed', 'cancelled') AND _from NOT IN ('completed', 'cancelled')",
    );
    for (const status of REVIEW_JOB_STATUSES) {
      const unfinished = status !== "completed" && status !== "cancelled";
      expect(canTransitionJob(status, "failed"), `${status} -> failed`).toBe(unfinished);
      expect(canTransitionJob(status, "cancelled"), `${status} -> cancelled`).toBe(
        unfinished || status === "cancelled",
      );
    }
    for (const [from, to] of pairs) {
      expect(
        canTransitionJob(from as ReviewJobStatus, to as ReviewJobStatus),
        `${from} -> ${to}`,
      ).toBe(true);
    }
    for (const from of REVIEW_JOB_STATUSES) {
      for (const to of REVIEW_JOB_STATUSES) {
        if (from === to || to === "failed" || to === "cancelled") continue;
        const inSql = pairs.some(([a, b]) => a === from && b === to);
        expect(canTransitionJob(from, to), `${from} -> ${to}`).toBe(inSql);
      }
    }
  });
});

describe("report state machine", () => {
  it("never allows a removal without Google's decision step", () => {
    expect(canTransitionReport("submitted", "removed")).toBe(false);
    expect(canTransitionReport("processing", "removed")).toBe(false);
    expect(canTransitionReport("decision", "removed")).toBe(true);
    expect(canTransitionReport("appeal_result", "removed")).toBe(true);
  });

  it("treats removal as final", () => {
    expect(nextReportStatuses("removed")).toEqual([]);
  });

  it("supports the appeal path after Google keeps a review", () => {
    expect(canTransitionReport("not_removed", "appeal_available")).toBe(true);
    expect(canTransitionReport("appeal_available", "appeal_submitted")).toBe(true);
    expect(canTransitionReport("appeal_submitted", "appeal_result")).toBe(true);
  });

  it("only accepts Google's own decisions as a removal source", () => {
    expect([...GOOGLE_DECISION_SOURCES].sort()).toEqual([
      "google_decision_notice",
      "google_legal_decision",
      "google_support_case",
    ]);
    expect(migration).toContain(
      "outcome_source IN ('google_decision_notice', 'google_support_case', 'google_legal_decision')",
    );
  });

  it("matches the transitions the database enforces", () => {
    const pairs = sqlPairs("report_transition_allowed");
    for (const from of REPORT_STATUSES) {
      for (const to of REPORT_STATUSES) {
        if (from === to) continue;
        const inSql = pairs.some(([a, b]) => a === from && b === to);
        expect(
          canTransitionReport(from as ReportStatus, to as ReportStatus),
          `${from} -> ${to}`,
        ).toBe(inSql);
      }
    }
  });
});
