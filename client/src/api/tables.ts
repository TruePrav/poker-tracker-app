import api from './client';
import type { TournamentTable, BalanceSuggestion } from 'shared';

export const fetchTables = (tournamentId: number) =>
  api.get<TournamentTable[]>(`/tournaments/${tournamentId}/tables`).then((r) => r.data);

export const createTable = (tournamentId: number, tableNumber: number, tableName?: string) =>
  api.post<TournamentTable>(`/tournaments/${tournamentId}/tables`, { tableNumber, tableName }).then((r) => r.data);

export const deleteTable = (tournamentId: number, tableId: number) =>
  api.delete(`/tournaments/${tournamentId}/tables/${tableId}`);

export const shuffleTables = (tournamentId: number) =>
  api.post<TournamentTable[]>(`/tournaments/${tournamentId}/tables/shuffle`).then((r) => r.data);

export const movePlayer = (tournamentId: number, playerId: number, toTableId: number, toSeat: number) =>
  api.post<TournamentTable[]>(`/tournaments/${tournamentId}/tables/move`, { playerId, toTableId, toSeat }).then((r) => r.data);

export const checkBalance = (tournamentId: number) =>
  api.get<{ balanced: boolean; suggestion: BalanceSuggestion | null }>(`/tournaments/${tournamentId}/tables/balance-check`).then((r) => r.data);
