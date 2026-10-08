import { apiClient } from '../../core/api/client';
import type { ApiResponse, FoodItem, FoodItemCategory } from '../../core/api/types';

export interface CreateFoodItemPayload {
  name: string;
  price: string;
  category: FoodItemCategory;
}

export interface UpdateFoodItemPayload {
  name: string;
  price: string;
}

export async function getFoodItems(category?: FoodItemCategory): Promise<FoodItem[]> {
  const res = await apiClient.get<ApiResponse<FoodItem[]>>('/food-items', {
    params: category ? { category } : undefined,
  });
  return res.data.data ?? [];
}

export async function createFoodItem(payload: CreateFoodItemPayload): Promise<FoodItem> {
  const res = await apiClient.post<ApiResponse<FoodItem>>('/food-items', payload);
  return res.data.data as FoodItem;
}

export async function updateFoodItem(id: string, payload: UpdateFoodItemPayload): Promise<FoodItem> {
  const res = await apiClient.put<ApiResponse<FoodItem>>(`/food-items/${id}`, payload);
  return res.data.data as FoodItem;
}

export async function deactivateFoodItem(id: string): Promise<void> {
  await apiClient.patch(`/food-items/${id}/deactivate`);
}
