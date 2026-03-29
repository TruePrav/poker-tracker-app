import { create } from 'zustand';
import type { Tournament, BalanceSuggestion } from 'shared';
import * as tournamentsApi from '../api/tournaments';
import * as tablesApi from '../api/tables';
import * as transactionsApi from '../api/transactions';

interface TournamentStore {
  tournament: Tournament | null;
  isLoading: boolean;
  balanceSuggestion: BalanceSuggestion | null;

  loadTournament: (id: number) => Promise<void>;
  createTournament: (data: Parameters<typeof tournamentsApi.createTournament>[0]) => Promise<Tournament>;
  updateSettings: (data: Record<string, any>) => Promise<void>;
  updateStatus: (status: string) => Promise<void>;

  addEntry: (playerId: number) => Promise<void>;
  removeEntry: (playerId: number) => Promise<void>;
  eliminatePlayer: (playerId: number) => Promise<void>;

  shuffleSeats: () => Promise<void>;
  createTable: (tableNumber: number, tableName?: string) => Promise<void>;
  deleteTable: (tableId: number) => Promise<void>;
  movePlayer: (playerId: number, toTableId: number, toSeat: number) => Promise<void>;
  checkBalance: () => Promise<void>;

  recordBuyIn: (playerId: number) => Promise<void>;
  recordRebuy: (playerId: number, amount?: number) => Promise<void>;
  recordTopUp: (playerId: number) => Promise<void>;
  recordPayout: (playerId: number, amount: number) => Promise<void>;
  undoTransaction: (txId: number) => Promise<void>;

  syncTimer: (currentLevel: number, timerSeconds: number) => Promise<void>;
  clear: () => void;
}

export const useTournamentStore = create<TournamentStore>((set, get) => ({
  tournament: null,
  isLoading: false,
  balanceSuggestion: null,

  loadTournament: async (id) => {
    set({ isLoading: true });
    const tournament = await tournamentsApi.fetchTournament(id);
    set({ tournament, isLoading: false });
    if (tournament.status === 'RUNNING' || tournament.status === 'PAUSED') {
      const result = await tablesApi.checkBalance(id);
      set({ balanceSuggestion: result.suggestion });
    }
  },

  createTournament: async (data) => {
    const tournament = await tournamentsApi.createTournament(data);
    set({ tournament });
    return tournament;
  },

  updateSettings: async (data) => {
    const t = get().tournament;
    if (!t) return;
    const updated = await tournamentsApi.updateTournamentSettings(t.id, data);
    set({ tournament: { ...t, ...updated } });
  },

  updateStatus: async (status) => {
    const t = get().tournament;
    if (!t) return;
    const updated = await tournamentsApi.updateTournamentStatus(t.id, status);
    set({ tournament: { ...t, ...updated } });
  },

  // These still refetch because they change entries/tables (complex nested state)
  addEntry: async (playerId) => {
    const t = get().tournament;
    if (!t) return;
    await tournamentsApi.addEntry(t.id, playerId);
    await get().loadTournament(t.id);
  },

  removeEntry: async (playerId) => {
    const t = get().tournament;
    if (!t) return;
    await tournamentsApi.removeEntry(t.id, playerId);
    await get().loadTournament(t.id);
  },

  eliminatePlayer: async (playerId) => {
    const t = get().tournament;
    if (!t) return;
    const { entries } = await tournamentsApi.eliminatePlayer(t.id, playerId);
    const activeEntries = entries.filter((entry) => entry.status === 'SEATED');
    const tables = (t.tables || []).map((table) => ({
      ...table,
      entries: activeEntries
        .filter((entry) => entry.tableId === table.id)
        .sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0)),
    }));

    set({
      tournament: {
        ...t,
        entries,
        tables,
      },
    });
  },

  shuffleSeats: async () => {
    const t = get().tournament;
    if (!t) return;
    await tablesApi.shuffleTables(t.id);
    await get().loadTournament(t.id);
  },

  createTable: async (tableNumber, tableName) => {
    const t = get().tournament;
    if (!t) return;
    await tablesApi.createTable(t.id, tableNumber, tableName);
    await get().loadTournament(t.id);
  },

  deleteTable: async (tableId) => {
    const t = get().tournament;
    if (!t) return;
    await tablesApi.deleteTable(t.id, tableId);
    await get().loadTournament(t.id);
  },

  movePlayer: async (playerId, toTableId, toSeat) => {
    const t = get().tournament;
    if (!t) return;
    const tables = await tablesApi.movePlayer(t.id, playerId, toTableId, toSeat);
    const tableEntries = tables.flatMap((table) => table.entries || []);
    const preservedEntries = (t.entries || []).filter((entry) => !tableEntries.some((updated) => updated.id === entry.id));

    set({
      tournament: {
        ...t,
        tables,
        entries: [...preservedEntries, ...tableEntries],
      },
    });
  },

  checkBalance: async () => {
    const t = get().tournament;
    if (!t) return;
    const result = await tablesApi.checkBalance(t.id);
    set({ balanceSuggestion: result.suggestion });
  },

  // Optimized: update prize pool locally from response instead of full refetch
  recordBuyIn: async (playerId) => {
    const t = get().tournament;
    if (!t) return;
    const { totalPrizePool, transaction } = await transactionsApi.recordBuyIn(t.id, playerId);
    set({
      tournament: {
        ...t,
        totalPrizePool: totalPrizePool ?? t.totalPrizePool,
        transactions: [...(t.transactions || []), transaction],
      },
    });
  },

  recordRebuy: async (playerId, amount?) => {
    const t = get().tournament;
    if (!t) return;
    const { totalPrizePool, transaction } = await transactionsApi.recordRebuy(t.id, playerId, amount);
    set({
      tournament: {
        ...t,
        totalPrizePool: totalPrizePool ?? t.totalPrizePool,
        transactions: [...(t.transactions || []), transaction],
      },
    });
  },

  recordTopUp: async (playerId) => {
    const t = get().tournament;
    if (!t) return;
    const { totalPrizePool, transaction } = await transactionsApi.recordTopUp(t.id, playerId);
    set({
      tournament: {
        ...t,
        totalPrizePool: totalPrizePool ?? t.totalPrizePool,
        transactions: [...(t.transactions || []), transaction],
      },
    });
  },

  recordPayout: async (playerId, amount) => {
    const t = get().tournament;
    if (!t) return;
    const { transaction } = await transactionsApi.recordPayout(t.id, playerId, amount);
    set({
      tournament: {
        ...t,
        transactions: [...(t.transactions || []), transaction],
      },
    });
  },

  undoTransaction: async (txId) => {
    const t = get().tournament;
    if (!t) return;
    const { deletedId, totalPrizePool } = await transactionsApi.deleteTransaction(t.id, txId);
    set({
      tournament: {
        ...t,
        totalPrizePool,
        transactions: (t.transactions || []).filter((tx) => tx.id !== deletedId),
      },
    });
  },

  syncTimer: async (currentLevel, timerSeconds) => {
    const t = get().tournament;
    if (!t) return;
    await tournamentsApi.updateTimerState(t.id, { currentLevel, timerSeconds });
  },

  clear: () => set({ tournament: null, balanceSuggestion: null }),
}));
