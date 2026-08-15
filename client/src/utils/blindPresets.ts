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

/** Tonight's structure. Durations default to 15 min and are editable after import. */
export function assBumpBlinds(minutes = 15): BlindPreset {
  return {
    name: 'ASS BUMP BLINDS',
    rebuysCloseAfterLevel: 6,
    defaultMinutes: minutes,
    levels: [
      L(5, 10, minutes),
      L(10, 20, minutes),
      L(15, 30, minutes),
      L(20, 40, minutes),
      L(25, 50, minutes),
      L(50, 100, minutes),
      // — rebuys close after level 6 —
      L(75, 150, minutes),
      L(100, 200, minutes),
      L(150, 300, minutes),
      L(250, 500, minutes),
      L(350, 700, minutes),
      L(500, 1000, minutes),
      L(750, 1500, minutes),
      L(1000, 2000, minutes),
    ],
  };
}

export type PresetFactory = (minutes?: number) => BlindPreset;

export const BLIND_PRESETS: PresetFactory[] = [assBumpBlinds];
