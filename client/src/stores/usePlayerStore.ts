import { create } from 'zustand';
import type { Player } from 'shared';
import * as playersApi from '../api/players';

interface PlayerStore {
  players: Player[];
  isLoading: boolean;
  fetchPlayers: () => Promise<void>;
  addPlayer: (name: string) => Promise<Player>;
  removePlayer: (id: number) => Promise<void>;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  players: [],
  isLoading: false,

  fetchPlayers: async () => {
    set({ isLoading: true });
    const players = await playersApi.fetchPlayers();
    set({ players, isLoading: false });
  },

  addPlayer: async (name: string) => {
    const player = await playersApi.createPlayer({ name });
    set((s) => ({ players: [...s.players, player].sort((a, b) => a.name.localeCompare(b.name)) }));
    return player;
  },

  removePlayer: async (id: number) => {
    await playersApi.deletePlayer(id);
    set((s) => ({ players: s.players.filter((p) => p.id !== id) }));
  },
}));
