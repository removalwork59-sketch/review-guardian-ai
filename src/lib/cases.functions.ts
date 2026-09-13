import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { ReviewAnalysis } from "./analysis-types";
import type {
  AiRunSummary,
  CaseDecision,
  CaseDetail,
  CaseRecord,
  CaseReportSummary,
  EvidenceItem,
  LocationRecord,
  ReportEvent,
} from "./case-types";
import { FriendlyError } from "./google.server";
import { canTransitionReport, GOOGLE_DECISION_SOURCES, REPORT_STATUSES } from "./state-machines";
import type { ReportStatus } from "./state-machines";
import { assertWorkspaceRole, ForbiddenError, requireWorkspace } from "./workspace-middleware";

export type ActionResult = { ok: true } | { ok: false; message: string; hint: string };

function actionFailure(error: unknown): ActionResult {
  if (error instanceof FriendlyError)
    return { ok: false, message: error.message, hint: error.hint };
  if (error instanceof ForbiddenError) return { ok: false, message: error.message, hint: "" };
  console.error("[cases]", error);
  return { ok: false, message: "That didn't work.", hint: "Please try again in a moment." };
}

const CASE_SELECT = [
  "id,location_id,decision,verdict,violation_category,headline,plain_summary,confidence,severity,",
  "rejection_risk,model_agreement,analysis,dismissed_at,created_at,",
  "review_locations(name,address),",
  "review_records(platform,review_url,canonical_source_url,author_name,rating,review_text,published_at,identity_status),",
  "reports(id,status,version,external_reference,submitted_at,decided_at,updated_at)",
].join("");

type ReportRow = {
  id: string;
  status: string;
  version: number;
  external_reference: string | null;
  submitted_at: string | null;
  decided_at: string | null;
  updated_at: string;
};

type CaseRow = {
  id: string;
  location_id: string;
  decision: string;
  verdict: string;
  violation_category: string;
  headline: string;
  plain_summary: string;
  confidence: number;
  severity: string;
  rejection_risk: string;
  model_agreement: string;
  analysis: unknown;
  dismissed_at: string | null;
  created_at: string;
  review_locations: { name: string; address: string } | null;
  review_records: {
    platform: string;
    review_url: string;
    canonical_source_url: string;
    author_name: string;
    rating: number | null;
    review_text: string;
    published_at: string | null;
    identity_status: string;
  } | null;
  reports: ReportRow[] | null;
};

function toReportSummary(row: ReportRow): CaseReportSummary {
  return {
    id: row.id,
    status: row.status as ReportStatus,
    version: row.version,
    externalReference: row.external_reference,
    submittedAt: row.submitted_at,
    decidedAt: row.decided_at,
    updatedAt: row.updated_at,
  };
}

function toCase(row: CaseRow): CaseRecord {
  const latest = [...(row.reports ?? [])].sort((a, b) => b.version - a.version)[0];
  return {
    id: row.id,
    locationId: row.location_id,
    locationName: row.review_locations?.name ?? "Unknown business",
    locationAddress: row.review_locations?.address ?? "",
    platform: row.review_records?.platform ?? "google",
    reviewUrl: row.review_records?.review_url ?? "",
    sourceUrl: row.review_records?.canonical_source_url ?? "",
    authorName: row.review_records?.author_name ?? "",
    reviewRating:
      row.review_records?.rating === null || row.review_records?.rating === undefined
        ? null
        : Number(row.review_records.rating),
    reviewText: row.review_records?.review_text ?? "",
    reviewPublishedAt: row.review_records?.published_at ?? null,
    identityStatus: row.review_records?.identity_status ?? "unverified",
    decision: row.decision as CaseDecision,
    verdict: row.verdict,
    violationCategory: row.violation_category,
    headline: row.headline,
    plainSummary: row.plain_summary,
    confidence: row.confidence,
    severity: row.severity,
    rejectionRisk: row.rejection_risk,
    modelAgreement: row.model_agreement,
    dismissed: Boolean(row.dismissed_at),
    createdAt: row.created_at,
    report: latest ? toReportSummary(latest) : null,
    analysis: (row.analysis ?? null) as ReviewAnalysis | null,
  };
}

export const listCases = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .handler(async ({ context }): Promise<CaseRecord[]> => {
    const { data, error } = await context.supabase
      .from("review_cases")
      .select(CASE_SELECT)
      .eq("workspace_id", context.workspaceId)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw error;
    return ((data ?? []) as unknown as CaseRow[]).map(toCase);
  });

export const listLocations = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .handler(async ({ context }): Promise<LocationRecord[]> => {
    const [{ data: locations, error }, { data: cases, error: caseError }] = await Promise.all([
      context.supabase
        .from("review_locations")
        .select("*")
        .eq("workspace_id", context.workspaceId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("review_cases")
        .select("location_id,created_at,reports(status,version)")
        .eq("workspace_id", context.workspaceId),
    ]);
    if (error) throw error;
    if (caseError) throw caseError;

    const rows = (cases ?? []) as unknown as Array<{
      location_id: string;
      created_at: string;
      reports: Array<{ status: string; version: number }> | null;
    }>;
    return (locations ?? []).map((location): LocationRecord => {
      const related = rows.filter((item) => item.location_id === location.id);
      const latestStatuses = related.map(
        (item) => [...(item.reports ?? [])].sort((a, b) => b.version - a.version)[0]?.status,
      );
      return {
        id: location.id,
        name: location.name,
        address: location.address,
        category: location.category,
        mapsUri: location.maps_uri,
        rating: location.rating === null ? null : Number(location.rating),
        ratingCount: location.rating_count,
        caseCount: related.length,
        reportedCount: latestStatuses.filter(
          (status) => status && !["draft", "ready"].includes(status),
        ).length,
        removedCount: latestStatuses.filter((status) => status === "removed").length,
        lastScanAt:
          related
            .map((item) => item.created_at)
            .sort()
            .at(-1) ?? null,
      };
    });
  });

export const getCaseDetail = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .inputValidator((input: unknown) => z.object({ caseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<CaseDetail | null> => {
    const { data: row, error } = await context.supabase
      .from("review_cases")
      .select(CASE_SELECT)
      .eq("id", data.caseId)
      .eq("workspace_id", context.workspaceId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;

    const [evidence, reports, runs] = await Promise.all([
      context.supabase
        .from("evidence_items")
        .select("id,kind,content,verified,excerpt_start,excerpt_end,position")
        .eq("case_id", data.caseId)
        .order("position", { ascending: true }),
      context.supabase
        .from("reports")
        .select(
          "id,status,version,route,report_reason,report_body,external_reference,outcome_source,outcome_note,submitted_at,decided_at,updated_at",
        )
        .eq("case_id", data.caseId)
        .order("version", { ascending: false }),
      context.supabase
        .from("ai_runs")
        .select("stage,provider,model,status,duration_ms,confidence,error_code,created_at")
        .eq("case_id", data.caseId)
        .order("created_at", { ascending: true }),
    ]);
    if (evidence.error) throw evidence.error;
    if (reports.error) throw reports.error;
    if (runs.error) throw runs.error;

    const reportIds = (reports.data ?? []).map((report) => report.id);
    const { data: events, error: eventsError } = reportIds.length
      ? await context.supabase
          .from("report_events")
          .select("id,report_id,from_status,to_status,note,metadata,created_at")
          .in("report_id", reportIds)
          .order("created_at", { ascending: true })
      : { data: [], error: null };
    if (eventsError) throw eventsError;

    return {
      ...toCase(row as unknown as CaseRow),
      evidence: (evidence.data ?? []).map((item): EvidenceItem => ({
        id: item.id,
        kind: item.kind as EvidenceItem["kind"],
        content: item.content,
        verified: item.verified,
        excerptStart: item.excerpt_start,
        excerptEnd: item.excerpt_end,
      })),
      reports: (reports.data ?? []).map((report) => ({
        ...toReportSummary(report as ReportRow),
        route: report.route,
        reportReason: report.report_reason,
        reportBody: report.report_body,
        outcomeSource: report.outcome_source,
        outcomeNote: report.outcome_note,
      })),
      reportEvents: (events ?? []).map((event): ReportEvent => ({
        id: event.id,
        reportId: event.report_id,
        fromStatus: event.from_status,
        toStatus: event.to_status,
        note: event.note,
        externalReference:
          (event.metadata as { external_reference?: string | null } | null)?.external_reference ??
          null,
        createdAt: event.created_at,
      })),
      aiRuns: (runs.data ?? []).map((run): AiRunSummary => ({
        stage: run.stage,
        provider: run.provider,
        model: run.model,
        status: run.status,
        durationMs: run.duration_ms,
        confidence: run.confidence,
        errorCode: run.error_code,
        createdAt: run.created_at,
      })),
    };
  });

export const transitionReport = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .inputValidator((input: unknown) =>
    z
      .object({
        reportId: z.string().uuid(),
        to: z.enum(REPORT_STATUSES),
        note: z.string().trim().max(1000).optional(),
        externalReference: z.string().trim().max(200).optional(),
        outcomeSource: z.enum(GOOGLE_DECISION_SOURCES).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<ActionResult> => {
    try {
      assertWorkspaceRole(context.workspaceRole, "member");
      const { data: current, error } = await context.supabase
        .from("reports")
        .select("id,status,case_id,workspace_id")
        .eq("id", data.reportId)
        .eq("workspace_id", context.workspaceId)
        .maybeSingle();
      if (error) throw error;
      if (!current) throw new FriendlyError("That report couldn't be found.");

      const from = current.status as ReportStatus;
      if (!canTransitionReport(from, data.to)) {
        throw new FriendlyError("That step isn't available for this report right now.");
      }
      if (data.to === "removed" && !data.outcomeSource) {
        throw new FriendlyError(
          "Record where Google confirmed the removal.",
          "A review is only marked removed after Google's own decision.",
        );
      }

      const now = new Date().toISOString();
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("reports")
        .update({
          status: data.to,
          updated_by: context.userId,
          outcome_note: data.note ?? "",
          ...(data.externalReference ? { external_reference: data.externalReference } : {}),
          ...(data.to === "submitted" ? { submitted_at: now } : {}),
          ...(["decision", "removed", "not_removed"].includes(data.to) ? { decided_at: now } : {}),
          ...(data.outcomeSource ? { outcome_source: data.outcomeSource } : {}),
        })
        .eq("id", data.reportId)
        .eq("workspace_id", context.workspaceId)
        .eq("status", from)
        .select("id")
        .maybeSingle();
      if (updateError) throw updateError;
      if (!updated)
        throw new FriendlyError("This report changed in the meantime.", "Refresh and try again.");

      const { writeAudit } = await import("./audit.server");
      await writeAudit({
        workspaceId: context.workspaceId,
        actorId: context.userId,
        action: "report.transitioned",
        entityType: "report",
        entityId: data.reportId,
        metadata: { from, to: data.to },
      });
      return { ok: true };
    } catch (error) {
      return actionFailure(error);
    }
  });

export const createReportForCase = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .inputValidator((input: unknown) => z.object({ caseId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<ActionResult> => {
    try {
      assertWorkspaceRole(context.workspaceRole, "member");
      const { data: caseRow, error } = await context.supabase
        .from("review_cases")
        .select("id,decision,analysis,reports(id)")
        .eq("id", data.caseId)
        .eq("workspace_id", context.workspaceId)
        .maybeSingle();
      if (error) throw error;
      if (!caseRow) throw new FriendlyError("That review couldn't be found.");
      if (caseRow.decision === "not_reportable") {
        throw new FriendlyError(
          "The analysis found no policy violation, so there's nothing to report.",
        );
      }
      if (((caseRow as { reports?: unknown[] }).reports ?? []).length > 0) {
        throw new FriendlyError("This review already has a report.");
      }
      const analysis = caseRow.analysis as unknown as ReviewAnalysis | null;
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: insertError } = await supabaseAdmin.from("reports").insert({
        workspace_id: context.workspaceId,
        case_id: data.caseId,
        version: 1,
        report_reason: analysis?.recommendedReportReason ?? "",
        report_body: analysis?.policyReasoning ?? "",
        created_by: context.userId,
        updated_by: context.userId,
      });
      if (insertError) throw insertError;
      return { ok: true };
    } catch (error) {
      return actionFailure(error);
    }
  });

export const setCaseDismissed = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .inputValidator((input: unknown) =>
    z.object({ caseId: z.string().uuid(), dismissed: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }): Promise<ActionResult> => {
    try {
      assertWorkspaceRole(context.workspaceRole, "member");
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: updated, error } = await supabaseAdmin
        .from("review_cases")
        .update({ dismissed_at: data.dismissed ? new Date().toISOString() : null })
        .eq("id", data.caseId)
        .eq("workspace_id", context.workspaceId)
        .select("id")
        .maybeSingle();
      if (error) throw error;
      if (!updated) throw new FriendlyError("That review couldn't be found.");
      const { writeAudit } = await import("./audit.server");
      await writeAudit({
        workspaceId: context.workspaceId,
        actorId: context.userId,
        action: data.dismissed ? "case.dismissed" : "case.restored",
        entityType: "review_case",
        entityId: data.caseId,
      });
      return { ok: true };
    } catch (error) {
      return actionFailure(error);
    }
  });

export const getWorkspaceSummary = createServerFn({ method: "POST" })
  .middleware([requireWorkspace])
  .handler(async ({ context }) => {
    const [{ data: workspace }, { data: members }, { data: isSuperadmin }] = await Promise.all([
      context.supabase
        .from("workspaces")
        .select("id,name,created_at")
        .eq("id", context.workspaceId)
        .single(),
      context.supabase
        .from("workspace_members")
        .select("user_id,role,created_at")
        .eq("workspace_id", context.workspaceId)
        .order("created_at", { ascending: true }),
      context.supabase.rpc("is_superadmin"),
    ]);
    const ids = (members ?? []).map((member) => member.user_id);
    const { data: profiles } = ids.length
      ? await context.supabase
          .from("profiles")
          .select("id,email,display_name,full_name")
          .in("id", ids)
      : { data: [] };
    return {
      id: context.workspaceId,
      name: workspace?.name ?? "Workspace",
      role: context.workspaceRole,
      isSuperadmin: isSuperadmin === true,
      members: (members ?? []).map((member) => {
        const profile = (profiles ?? []).find((item) => item.id === member.user_id);
        return {
          userId: member.user_id,
          role: member.role,
          email: profile?.email ?? null,
          name: profile?.display_name || profile?.full_name || "",
          isYou: member.user_id === context.userId,
        };
      }),
    };
  });
