import { apiClient } from '../../core/api/client';
import type { ApiResponse, Invoice, ItemType, SessionOrder, TableSession } from '../../core/api/types';

export async function openTable(tableId: string): Promise<TableSession> {
  const res = await apiClient.post<ApiResponse<TableSession>>('/table-sessions', { tableId });
  return res.data.data as TableSession;
}

interface CloseTableSessionResponse {
  session: TableSession;
  invoice: Invoice;
}

export async function closeTable(sessionId: string): Promise<Invoice> {
  const res = await apiClient.post<ApiResponse<CloseTableSessionResponse>>(
    `/table-sessions/${sessionId}/close`
  );
  return (res.data.data as CloseTableSessionResponse).invoice;
}

export async function getSessionDetail(sessionId: string): Promise<TableSession> {
  const res = await apiClient.get<ApiResponse<TableSession>>(`/table-sessions/${sessionId}`);
  return res.data.data as TableSession;
}

export async function getSessionOrders(sessionId: string): Promise<SessionOrder[]> {
  const res = await apiClient.get<ApiResponse<SessionOrder[]>>(`/table-sessions/${sessionId}/orders`);
  return res.data.data ?? [];
}

export async function addSessionOrder(
  sessionId: string,
  itemType: ItemType,
  itemId: string,
  quantity: number
): Promise<SessionOrder> {
  const res = await apiClient.post<ApiResponse<SessionOrder>>(`/table-sessions/${sessionId}/orders`, {
    itemType,
    itemId,
    quantity,
  });
  return res.data.data as SessionOrder;
}

export async function updateSessionOrderQuantity(
  sessionId: string,
  orderId: string,
  quantity: number
): Promise<SessionOrder> {
  const res = await apiClient.patch<ApiResponse<SessionOrder>>(
    `/table-sessions/${sessionId}/orders/${orderId}`,
    { quantity }
  );
  return res.data.data as SessionOrder;
}

export async function deleteSessionOrder(sessionId: string, orderId: string): Promise<void> {
  await apiClient.delete(`/table-sessions/${sessionId}/orders/${orderId}`);
}
