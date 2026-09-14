import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { STATUS_LABELS, VERDICT_LABELS } from "./case-types";
import type { CaseRecord } from "./case-types";

const CASE_SELECT = "*, locations ( name, address )";

function toCase(row: any): CaseRecord {
  const location = row.locations ?? {};
  return {
    id: row.id,
    locationId: row.location_id,
    locationName: location.name ?? "Unknown business",
    locationAddress: location.address ?? "",
    platform: row.platform,
    sourceUrl: row.source_url,
    reviewUrl: row.review_url,
    authorName: row.author_name,
    reviewRating: row.review_rating === null ? null : Number(row.review_rating),
    reviewText: row.review_text,
    reviewRelativeTime: row.review_relative_time,
    verdict: row.verdict,
    violationCategory: row.violation_category,
    headline: row.headline,
    plainSummary: row.plain_summary,
    confidence: row.confidence,
    severity: row.severity,
    rejectionRisk: row.rejection_risk,
    status: row.status,
    statusNote: row.status_note ?? "",
    reportedAt: row.reported_at,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    analysis: row.analysis ?? null,
  };
}

function wrapText(text: string, font: any, size: number, maxWidth: number) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function buildScanReportPdf(item: CaseRecord) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]); // US Letter
  const { width, height } = page.getSize();
  const margin = 54;
  const contentWidth = width - margin * 2;
  let y = height - margin;

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const dark = rgb(0.06, 0.07, 0.12);
  const muted = rgb(0.4, 0.45, 0.55);
  const brand = rgb(0.06, 0.46, 0.43);
  const black = rgb(0, 0, 0);

  // Header
  page.drawText("Removal Work — Scan Report", {
    x: margin,
    y,
    size: 22,
    font: bold,
    color: dark,
  });
  y -= 26;

  page.drawText(`Generated ${new Date().toLocaleString()}`, {
    x: margin,
    y,
    size: 10,
    font,
    color: muted,
  });
  y -= 28;

  // Business / site
  page.drawText("Business / Site", {
    x: margin,
    y,
    size: 10,
    font: bold,
    color: muted,
  });
  y -= 16;
  page.drawText(item.locationName, {
    x: margin,
    y,
    size: 14,
    font: bold,
    color: black,
  });
  y -= 16;
  const addressLines = wrapText(
    item.locationAddress || "Address not provided",
    font,
    10,
    contentWidth,
  );
  for (const line of addressLines) {
    page.drawText(line, { x: margin, y, size: 10, font, color: black });
    y -= 13;
  }
  y -= 10;

  // Platform & status
  page.drawText("Platform", { x: margin, y, size: 10, font: bold, color: muted });
  page.drawText("Current status", {
    x: margin + contentWidth * 0.5,
    y,
    size: 10,
    font: bold,
    color: muted,
  });
  y -= 16;
  page.drawText(item.platform === "google" ? "Google Maps" : item.platform, {
    x: margin,
    y,
    size: 11,
    font,
    color: black,
  });
  page.drawText(STATUS_LABELS[item.status] ?? item.status, {
    x: margin + contentWidth * 0.5,
    y,
    size: 11,
    font: bold,
    color: brand,
  });
  y -= 22;

  // Verdict
  page.drawText("AI verdict", { x: margin, y, size: 10, font: bold, color: muted });
  y -= 16;
  page.drawText(`${VERDICT_LABELS[item.verdict] ?? item.verdict} — ${item.confidence}% confidence`, {
    x: margin,
    y,
    size: 12,
    font: bold,
    color: black,
  });
  y -= 16;
  const summaryLines = wrapText(item.plainSummary, font, 10, contentWidth);
  for (const line of summaryLines) {
    page.drawText(line, { x: margin, y, size: 10, font, color: black });
    y -= 13;
  }
  y -= 10;

  // Review
  page.drawText("Review", { x: margin, y, size: 10, font: bold, color: muted });
  y -= 16;
  page.drawText(
    `${item.authorName}${item.reviewRating !== null ? ` — ${item.reviewRating}/5 stars` : ""} · ${item.reviewRelativeTime}`,
    { x: margin, y, size: 11, font: bold, color: black },
  );
  y -= 16;
  const reviewLines = wrapText(item.reviewText, font, 10, contentWidth);
  for (const line of reviewLines) {
    page.drawText(line, { x: margin, y, size: 10, font, color: black });
    y -= 13;
  }
  y -= 14;

  // Evidence
  const analysis = item.analysis;
  if (analysis?.evidence?.length) {
    page.drawText("Evidence", { x: margin, y, size: 10, font: bold, color: muted });
    y -= 14;
    for (const evidence of analysis.evidence) {
      const lines = wrapText(`• ${evidence}`, font, 10, contentWidth);
      for (const line of lines) {
        page.drawText(line, { x: margin, y, size: 10, font, color: black });
        y -= 13;
      }
      y -= 2;
    }
    y -= 8;
  }

  if (analysis?.counterEvidence?.length) {
    page.drawText("Counter-evidence", {
      x: margin,
      y,
      size: 10,
      font: bold,
      color: muted,
    });
    y -= 14;
    for (const evidence of analysis.counterEvidence) {
      const lines = wrapText(`• ${evidence}`, font, 10, contentWidth);
      for (const line of lines) {
        page.drawText(line, { x: margin, y, size: 10, font, color: black });
        y -= 13;
      }
      y -= 2;
    }
    y -= 8;
  }

  if (analysis?.recommendedAction) {
    page.drawText("Recommended action", {
      x: margin,
      y,
      size: 10,
      font: bold,
      color: muted,
    });
    y -= 14;
    const lines = wrapText(analysis.recommendedAction, font, 10, contentWidth);
    for (const line of lines) {
      page.drawText(line, { x: margin, y, size: 10, font, color: black });
      y -= 13;
    }
  }

  // Footer
  page.drawText(
    "This report is an AI policy assessment. Removal Work never submits reports without your confirmation.",
    {
      x: margin,
      y: 40,
      size: 8,
      font,
      color: muted,
    },
  );

  return await pdfDoc.save();
}

export const exportScanReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("review_cases")
      .select(CASE_SELECT)
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .single();
    if (error) throw error;

    const item = toCase(row);
    const pdfBytes = await buildScanReportPdf(item);
    const fileName = `removal-work-scan-${item.locationName.replace(/\s+/g, "-").toLowerCase().slice(0, 40)}-${new Date().toISOString().slice(0, 10)}.pdf`;

    const { error: insertError } = await context.supabase.from("scan_exports").insert({
      user_id: context.userId,
      case_id: item.id,
      file_name: fileName,
      file_size: pdfBytes.length,
    });
    if (insertError) throw insertError;

    return {
      fileName,
      pdfBase64: Buffer.from(pdfBytes).toString("base64"),
      size: pdfBytes.length,
    };
  });

export const listScanExports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("scan_exports")
      .select("*, review_cases ( location_name, verdict, confidence, status )")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;

    return (data ?? []).map((row: any) => ({
      id: row.id,
      caseId: row.case_id,
      fileName: row.file_name,
      fileSize: row.file_size,
      createdAt: row.created_at,
      locationName: row.review_cases?.location_name ?? "Unknown business",
      verdict: row.review_cases?.verdict ?? "",
      confidence: row.review_cases?.confidence ?? 0,
      status: row.review_cases?.status ?? "",
    }));
  });
