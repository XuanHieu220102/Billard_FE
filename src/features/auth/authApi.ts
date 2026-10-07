import { apiClient } from '../../core/api/client';
import type { ApiResponse, AuthResponse } from '../../core/api/types';

export interface RegisterPayload {
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  shopName: string;
}

export interface LoginPayload {
  phoneNumber: string;
  password: string;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/register', payload);
  return res.data.data as AuthResponse;
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', payload);
  return res.data.data as AuthResponse;
}

export async function logout(): Promise<void> {
  await apiClient.post('/auth/logout');
}
