import { apiClient } from '../../core/api/client';
import type { ApiResponse, Invoice } from '../../core/api/types';

export const DISCOUNT_OPTIONS = [0, 10, 30, 50] as const;

export async function getInvoice(id: string): Promise<Invoice> {
  const res = await apiClient.get<ApiResponse<Invoice>>(`/invoices/${id}`);
  return res.data.data as Invoice;
}

export async function applyDiscount(id: string, discountPercent: number): Promise<Invoice> {
  const res = await apiClient.patch<ApiResponse<Invoice>>(`/invoices/${id}/discount`, {
    discountPercent,
  });
  return res.data.data as Invoice;
}

export async function payInvoice(id: string, paymentMethod: string): Promise<Invoice> {
  const res = await apiClient.post<ApiResponse<Invoice>>(`/invoices/${id}/pay`, {
    paymentMethod,
  });
  return res.data.data as Invoice;
}
