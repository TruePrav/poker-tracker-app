/**
 * Built-in blind structures that can be created with one tap, so a 14-level
 * ladder doesn't have to be typed in by hand at the table.
 */

export interface PresetLevel {
  smallBlind: number;
  bigBlind: number;
  ante: number;
  durationMinutes: number;
  isBreak: boolean;
}

export interface BlindPreset {
  name: string;
  /** Rebuys/late entry close once this level finishes. 0 = no cutoff. */
  rebuysCloseAfterLevel: number;
  defaultMinutes: number;
  levels: PresetLevel[];
}

const L = (smallBlind: number, bigBlind: number, durationMinutes: number): PresetLevel => ({
  smallBlind,
  bigBlind,
  ante: 0,
  durationMinutes,
  isBreak: false,
});

/**
 * Tonight's structure: slower early levels to give people time to arrive and
 * settle, then a faster clip once rebuys close. Durations stay editable in the
 * level editor after importing.
 *
 * Levels 1-5 run 20 minutes, levels 6-14 run 15 — 3 hours 55 minutes of play.
 */
const EARLY_MINUTES = 20;
const LATE_MINUTES = 15;
const EARLY_LEVEL_COUNT = 5;

export function assBumpBlinds(): BlindPreset {
  const blinds: Array<[number, number]> = [
    [5, 10],
    [10, 20],
    [15, 30],
    [20, 40],
    [25, 50],
    [50, 100],
    // — rebuys close after level 6 —
    [75, 150],
    [100, 200],
    [150, 300],
    [250, 500],
    [350, 700],
    [500, 1000],
    [750, 1500],
    [1000, 2000],
  ];

  return {
    name: 'ASS BUMP BLINDS',
    rebuysCloseAfterLevel: 6,
    defaultMinutes: LATE_MINUTES,
    levels: blinds.map(([small, big], i) =>
      L(small, big, i < EARLY_LEVEL_COUNT ? EARLY_MINUTES : LATE_MINUTES)
    ),
  };
}

/** Human-readable timing summary for the import button. */
export function describeTiming(preset: BlindPreset): string {
  const total = preset.levels.reduce((sum, l) => sum + l.durationMinutes, 0);
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  return `${EARLY_LEVEL_COUNT}×${EARLY_MINUTES}min then ${LATE_MINUTES}min · ${hours}h ${mins}m total`;
}

export type PresetFactory = () => BlindPreset;

export const BLIND_PRESETS: PresetFactory[] = [assBumpBlinds];
