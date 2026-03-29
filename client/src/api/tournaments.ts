import api from './client';
import type { Tournament, CreateTournamentDTO, TournamentEntry } from 'shared';

export const fetchTournaments = () => api.get<Tournament[]>('/tournaments').then((r) => r.data);
export const fetchTournament = (id: number) => api.get<Tournament>(`/tournaments/${id}`).then((r) => r.data);
export const createTournament = (data: CreateTournamentDTO) => api.post<Tournament>('/tournaments', data).then((r) => r.data);
export const updateTournamentSettings = (id: number, data: Partial<CreateTournamentDTO>) => api.patch<Tournament>(`/tournaments/${id}/settings`, data).then((r) => r.data);
export const updateTournamentStatus = (id: number, status: string) => api.patch<Tournament>(`/tournaments/${id}/status`, { status }).then((r) => r.data);
export const updateTimerState = (id: number, data: { currentLevel?: number; timerSeconds?: number }) => api.patch(`/tournaments/${id}/timer`, data);
export const addEntry = (tournamentId: number, playerId: number) => api.post<TournamentEntry>(`/tournaments/${tournamentId}/entries`, { playerId }).then((r) => r.data);
export const removeEntry = (tournamentId: number, playerId: number) => api.delete(`/tournaments/${tournamentId}/entries/${playerId}`);
export const assignSeat = (tournamentId: number, playerId: number, tableId: number | null, seatNumber: number | null) =>
  api.patch(`/tournaments/${tournamentId}/entries/${playerId}/seat`, { tableId, seatNumber }).then((r) => r.data);

interface EliminatePlayerResponse {
  entry: TournamentEntry;
  entries: TournamentEntry[];
}

export const eliminatePlayer = (tournamentId: number, playerId: number) =>
  api.patch<EliminatePlayerResponse>(`/tournaments/${tournamentId}/entries/${playerId}/eliminate`).then((r) => r.data);

export const deleteTournament = (id: number) =>
  api.delete<{ deleted: { id: number; name: string; status: string } }>(`/tournaments/${id}`).then((r) => r.data);

export const deleteActiveTournaments = () =>
  api
    .delete<{ deletedCount: number; tournaments: Array<{ id: number; name: string; status: string }> }>(
      '/tournaments/active'
    )
    .then((r) => r.data);
