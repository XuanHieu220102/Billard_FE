import { apiClient } from '../../core/api/client';
import type { ApiResponse, Tournament, TournamentDetail, TournamentFormat } from '../../core/api/types';

export interface SaveTournamentPayload {
  name: string;
  format: TournamentFormat;
  eventDate: string | null;
  prize: string | null;
  note: string | null;
  participantNames: string[];
}

export async function getTournaments(): Promise<Tournament[]> {
  const res = await apiClient.get<ApiResponse<Tournament[]>>('/tournaments');
  return res.data.data ?? [];
}

export async function getTournamentDetail(id: string): Promise<TournamentDetail> {
  const res = await apiClient.get<ApiResponse<TournamentDetail>>(`/tournaments/${id}`);
  return res.data.data as TournamentDetail;
}

export async function createTournament(payload: SaveTournamentPayload): Promise<TournamentDetail> {
  const res = await apiClient.post<ApiResponse<TournamentDetail>>('/tournaments', payload);
  return res.data.data as TournamentDetail;
}

export async function updateTournament(id: string, payload: SaveTournamentPayload): Promise<TournamentDetail> {
  const res = await apiClient.put<ApiResponse<TournamentDetail>>(`/tournaments/${id}`, payload);
  return res.data.data as TournamentDetail;
}

export async function setupTournament(id: string): Promise<TournamentDetail> {
  const res = await apiClient.post<ApiResponse<TournamentDetail>>(`/tournaments/${id}/setup`);
  return res.data.data as TournamentDetail;
}

export async function setMatchWinner(tournamentId: string, matchId: string, winnerId: string): Promise<void> {
  await apiClient.patch(`/tournaments/${tournamentId}/matches/${matchId}/winner`, { winnerId });
}
