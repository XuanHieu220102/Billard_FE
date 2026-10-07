import { apiClient } from '../../core/api/client';
import type { ApiResponse, DrinkItem } from '../../core/api/types';

export interface DrinkItemPayload {
  name: string;
  price: string;
}

export async function getDrinkItems(): Promise<DrinkItem[]> {
  const res = await apiClient.get<ApiResponse<DrinkItem[]>>('/drink-items');
  return res.data.data ?? [];
}

export async function createDrinkItem(payload: DrinkItemPayload): Promise<DrinkItem> {
  const res = await apiClient.post<ApiResponse<DrinkItem>>('/drink-items', payload);
  return res.data.data as DrinkItem;
}

export async function updateDrinkItem(id: string, payload: DrinkItemPayload): Promise<DrinkItem> {
  const res = await apiClient.put<ApiResponse<DrinkItem>>(`/drink-items/${id}`, payload);
  return res.data.data as DrinkItem;
}

export async function deactivateDrinkItem(id: string): Promise<void> {
  await apiClient.patch(`/drink-items/${id}/deactivate`);
}

export async function addStockEntry(id: string, quantityAdded: number): Promise<DrinkItem> {
  const res = await apiClient.post<ApiResponse<DrinkItem>>(`/drink-items/${id}/stock-entries`, {
    quantityAdded,
  });
  return res.data.data as DrinkItem;
}
