import { apiClient } from '../../core/api/client';
import type { ApiResponse, Table } from '../../core/api/types';

export interface CreateTablePayload {
  tableNumber: string;
  tableType?: string;
  pricePerHour: string;
}

export interface UpdateTablePayload {
  tableNumber: string;
  tableType?: string;
  pricePerHour: string;
}

export const DEFAULT_PRICE_PER_HOUR = '40000';

export async function getTables(): Promise<Table[]> {
  const res = await apiClient.get<ApiResponse<Table[]>>('/tables');
  return res.data.data ?? [];
}

export async function createTable(payload: CreateTablePayload): Promise<Table> {
  const res = await apiClient.post<ApiResponse<Table>>('/tables', payload);
  return res.data.data as Table;
}

export async function updateTable(id: string, payload: UpdateTablePayload): Promise<Table> {
  const res = await apiClient.put<ApiResponse<Table>>(`/tables/${id}`, payload);
  return res.data.data as Table;
}

export async function deactivateTable(id: string): Promise<void> {
  await apiClient.patch(`/tables/${id}/deactivate`);
}
