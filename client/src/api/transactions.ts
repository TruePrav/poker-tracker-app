import api from './client';
import type { Transaction } from 'shared';

interface TransactionResponse {
  transaction: Transaction;
  totalPrizePool?: number;
}

export const fetchTransactions = (tournamentId: number) =>
  api.get<Transaction[]>(`/tournaments/${tournamentId}/transactions`).then((r) => r.data);

export const recordBuyIn = (tournamentId: number, playerId: number) =>
  api.post<TransactionResponse>(`/tournaments/${tournamentId}/transactions/buyin`, { playerId }).then((r) => r.data);

export const recordRebuy = (tournamentId: number, playerId: number, amount?: number) =>
  api.post<TransactionResponse>(`/tournaments/${tournamentId}/transactions/rebuy`, { playerId, ...(amount != null ? { amount } : {}) }).then((r) => r.data);

export const recordTopUp = (tournamentId: number, playerId: number) =>
  api.post<TransactionResponse>(`/tournaments/${tournamentId}/transactions/topup`, { playerId }).then((r) => r.data);

export const recordPayout = (tournamentId: number, playerId: number, amount: number) =>
  api.post<TransactionResponse>(`/tournaments/${tournamentId}/transactions/payout`, { playerId, amount }).then((r) => r.data);

export const deleteTransaction = (tournamentId: number, txId: number) =>
  api.delete<{ deletedId: number; type: string; totalPrizePool: number }>(
    `/tournaments/${tournamentId}/transactions/${txId}`
  ).then((r) => r.data);
