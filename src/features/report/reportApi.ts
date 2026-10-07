import { apiClient } from '../../core/api/client';
import type { ApiResponse, ReportPeriod, ReportSummary } from '../../core/api/types';

export async function getReportSummary(period: ReportPeriod): Promise<ReportSummary> {
  const res = await apiClient.get<ApiResponse<ReportSummary>>('/reports/summary', {
    params: { period },
  });
  return res.data.data as ReportSummary;
}
