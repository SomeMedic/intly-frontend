import type { AdminBulkReportResult, AdminReport } from "@/types";

export type ReportBulkAction = "resolve" | "dismiss";

export type ReportBulkIntent = {
  action: ReportBulkAction;
  ids: string[];
  reason: string;
};

export function selectedReports(reports: AdminReport[], selectedIds: string[]) {
  const selected = new Set(selectedIds);
  return reports.filter((report) => selected.has(report.id));
}

export function selectedReportTypes(reports: AdminReport[]) {
  return Array.from(new Set(reports.map((report) => report.type).filter(Boolean))).sort();
}

export function canBulkTriage(reports: AdminReport[]) {
  return reports.length > 0 && selectedReportTypes(reports).length === 1;
}

export function failedBulkIds(results: AdminBulkReportResult[]) {
  return results.filter((item) => !item.success).map((item) => item.id);
}

export function summarizeBulkResult(results: AdminBulkReportResult[]) {
  return {
    total: results.length,
    succeeded: results.filter((item) => item.success).length,
    failed: results.filter((item) => !item.success).length,
  };
}

export function reportStatusIntent(status?: string) {
  if (status === "Resolved") return "success" as const;
  if (status === "Dismissed") return "neutral" as const;
  if (status === "In review") return "primary" as const;
  return "warning" as const;
}

export function reportAssigneePayload(assignedAdminId: string) {
  return assignedAdminId ? assignedAdminId : null;
}
