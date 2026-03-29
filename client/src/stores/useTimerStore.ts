import { create } from 'zustand';
import type { BlindLevel } from 'shared';

interface TimerStore {
  isRunning: boolean;
  remainingSeconds: number;
  currentLevel: number;
  blindLevels: BlindLevel[];

  // Derived getters via selectors
  setBlindLevels: (levels: BlindLevel[]) => void;
  setCurrentLevel: (level: number) => void;
  setRemainingSeconds: (seconds: number) => void;
  setIsRunning: (running: boolean) => void;

  start: () => void;
  pause: () => void;
  tick: () => boolean; // returns true if level completed
  adjustTime: (deltaSeconds: number) => void;
  nextLevel: () => void;
  previousLevel: () => void;
  resetLevel: () => void;
  initializeFromTournament: (currentLevel: number, timerSeconds: number, levels: BlindLevel[]) => void;
}

export const useTimerStore = create<TimerStore>((set, get) => ({
  isRunning: false,
  remainingSeconds: 0,
  currentLevel: 1,
  blindLevels: [],

  setBlindLevels: (levels) => set({ blindLevels: levels }),
  setCurrentLevel: (level) => set({ currentLevel: level }),
  setRemainingSeconds: (seconds) => set({ remainingSeconds: seconds }),
  setIsRunning: (running) => set({ isRunning: running }),

  start: () => {
    const { remainingSeconds, blindLevels, currentLevel } = get();
    const remaining = Number(remainingSeconds);
    if (!Number.isFinite(remaining) || remaining <= 0) {
      const level = blindLevels.find((l) => l.level === currentLevel);
      if (level) {
        set({ remainingSeconds: Number(level.durationMinutes) * 60, isRunning: true });
        return;
      }
    }
    set({ isRunning: true });
  },

  pause: () => set({ isRunning: false }),

  tick: () => {
    const { remainingSeconds } = get();
    const remaining = Number(remainingSeconds);
    if (!Number.isFinite(remaining) || remaining <= 1) {
      set({ remainingSeconds: 0, isRunning: false });
      return true; // level completed
    }
    set({ remainingSeconds: remaining - 1 });
    return false;
  },

  adjustTime: (deltaSeconds) => {
    set((s) => ({
      remainingSeconds: Math.max(0, s.remainingSeconds + deltaSeconds),
    }));
  },

  nextLevel: () => {
    const { currentLevel, blindLevels } = get();
    const nextLvl = currentLevel + 1;
    const level = blindLevels.find((l) => l.level === nextLvl);
    if (level) {
      set({
        currentLevel: nextLvl,
        remainingSeconds: level.durationMinutes * 60,
        isRunning: false,
      });
    }
  },

  previousLevel: () => {
    const { currentLevel, blindLevels } = get();
    if (currentLevel <= 1) return;
    const prevLvl = currentLevel - 1;
    const level = blindLevels.find((l) => l.level === prevLvl);
    if (level) {
      set({
        currentLevel: prevLvl,
        remainingSeconds: level.durationMinutes * 60,
        isRunning: false,
      });
    }
  },

  resetLevel: () => {
    const { currentLevel, blindLevels } = get();
    const level = blindLevels.find((l) => l.level === currentLevel);
    if (level) {
      set({ remainingSeconds: level.durationMinutes * 60, isRunning: false });
    }
  },

  initializeFromTournament: (currentLevel, timerSeconds, levels) => {
    const level = levels.find((l) => l.level === currentLevel);
    const tournamentSeconds = Number(timerSeconds);
    const defaultSeconds = level ? Number(level.durationMinutes) * 60 : 0;
    set({
      currentLevel: Number(currentLevel) || 1,
      remainingSeconds: Number.isFinite(tournamentSeconds) && tournamentSeconds > 0 ? tournamentSeconds : defaultSeconds,
      blindLevels: levels,
      isRunning: false,
    });
  },
}));

// Selectors
export const selectCurrentBlind = (state: TimerStore) =>
  state.blindLevels.find((l) => l.level === state.currentLevel) || null;

export const selectNextBlind = (state: TimerStore) =>
  state.blindLevels.find((l) => l.level === state.currentLevel + 1) || null;

export const selectProgress = (state: TimerStore) => {
  const level = state.blindLevels.find((l) => l.level === state.currentLevel);
  if (!level) return 0;
  const total = level.durationMinutes * 60;
  return total > 0 ? (total - state.remainingSeconds) / total : 0;
};
