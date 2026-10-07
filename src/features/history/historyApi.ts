import { apiClient } from '../../core/api/client';
import type { ApiResponse, Invoice, TableSession } from '../../core/api/types';

export interface HistoryQuery {
  from?: string;
  to?: string;
}

export async function getSessionHistory(query: HistoryQuery): Promise<TableSession[]> {
  const res = await apiClient.get<ApiResponse<TableSession[]>>('/history/sessions', {
    params: query,
  });
  return res.data.data ?? [];
}

export async function getInvoiceHistory(query: HistoryQuery): Promise<Invoice[]> {
  const res = await apiClient.get<ApiResponse<Invoice[]>>('/history/invoices', {
    params: query,
  });
  return res.data.data ?? [];
}
