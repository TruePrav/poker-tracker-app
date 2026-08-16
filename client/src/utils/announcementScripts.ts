/**
 * Announcement scripts. Defaults are tuned for tonight's game but every one of
 * these is editable from the display settings panel and stored per-device, so
 * wording can be changed at the table without a redeploy.
 */

const INTRO_KEY = 'announcer.script.intro';
const LEVEL_KEY = 'announcer.script.level';
const BREAK_KEY = 'announcer.script.break';
const BUYINS_KEY = 'announcer.script.buyinsClosed';
const REBUY_LEVEL_KEY = 'announcer.rebuysCloseAfterLevel';

const INTRO_SEGMENTS_KEY = 'announcer.introSegments';

/**
 * The intro plays as a sequence: a segment can be spoken (with its own voice)
 * or a sound effect. That lets the opening switch voices partway through —
 * a straight welcome, a record scratch, then a different voice for the roast.
 */
export interface IntroSegment {
  id: string;
  kind: 'speech' | 'sfx';
  text?: string;
  sfx?: 'scratch';
  /** Per-segment overrides; null/undefined falls back to the global voice. */
  voiceURI?: string | null;
  elevenVoiceId?: string | null;
}

export const DEFAULT_INTRO_SEGMENTS: IntroSegment[] = [
  {
    id: 'welcome',
    kind: 'speech',
    text: 'Namaskar, ladies and gentlemen, and welcome to the Mahtani Residence!',
  },
  { id: 'scratch', kind: 'sfx', sfx: 'scratch' },
  {
    id: 'roast',
    kind: 'speech',
    // "Listen up" spelled out so the engine pronounces it properly.
    text:
      'Listen up Bhenchodes. Tonight, we celebrate ASS BUMP — Amrit. Sanjay. Sunil. And Bhavesh. ' +
      'Some will kick ass, some will catch their ass. ' +
      'The cards will decide your fate in just 2 minutes! Get ready for a bumpy ass ride!',
  },
];

export function getIntroSegments(): IntroSegment[] {
  const raw = localStorage.getItem(INTRO_SEGMENTS_KEY);
  if (!raw) return DEFAULT_INTRO_SEGMENTS.map((s) => ({ ...s }));
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {
    // fall through to defaults on corrupt storage
  }
  return DEFAULT_INTRO_SEGMENTS.map((s) => ({ ...s }));
}

export function saveIntroSegments(segments: IntroSegment[]) {
  localStorage.setItem(INTRO_SEGMENTS_KEY, JSON.stringify(segments));
}

export function resetIntroSegments() {
  localStorage.removeItem(INTRO_SEGMENTS_KEY);
}

/** Flat text of the intro, for anywhere that needs a plain string. */
export const DEFAULT_INTRO = DEFAULT_INTRO_SEGMENTS.filter((s) => s.kind === 'speech')
  .map((s) => s.text)
  .join(' ');

export const DEFAULT_LEVEL = 'Attention players. Level {level} is complete. Blinds are now {smallBlind} and {bigBlind}. Good luck!';

export const DEFAULT_BREAK = 'Attention players. It is break time. Please stretch your legs, refill your drinks, and do not touch the chips.';

export const DEFAULT_BUYINS_CLOSED = 'Attention players. Buy-ins are now closed. No more late entries. From here, it is survival only!';

export interface Scripts {
  intro: string;
  level: string;
  breakTime: string;
  buyinsClosed: string;
}

export function getScripts(): Scripts {
  return {
    intro: localStorage.getItem(INTRO_KEY) ?? DEFAULT_INTRO,
    level: localStorage.getItem(LEVEL_KEY) ?? DEFAULT_LEVEL,
    breakTime: localStorage.getItem(BREAK_KEY) ?? DEFAULT_BREAK,
    buyinsClosed: localStorage.getItem(BUYINS_KEY) ?? DEFAULT_BUYINS_CLOSED,
  };
}

export function saveScripts(patch: Partial<Scripts>) {
  if (patch.intro !== undefined) localStorage.setItem(INTRO_KEY, patch.intro);
  if (patch.level !== undefined) localStorage.setItem(LEVEL_KEY, patch.level);
  if (patch.breakTime !== undefined) localStorage.setItem(BREAK_KEY, patch.breakTime);
  if (patch.buyinsClosed !== undefined) localStorage.setItem(BUYINS_KEY, patch.buyinsClosed);
}

export function resetScripts() {
  [INTRO_KEY, LEVEL_KEY, BREAK_KEY, BUYINS_KEY, REBUY_LEVEL_KEY].forEach((k) => localStorage.removeItem(k));
}

/**
 * Rebuys/late entry close once this level finishes. Tonight's ASS BUMP ladder
 * closes them after level 6. Set to 0 to disable the automatic call.
 */
export function getRebuysCloseAfterLevel(): number {
  const raw = localStorage.getItem(REBUY_LEVEL_KEY);
  return raw === null ? 6 : Number(raw) || 0;
}

export function setRebuysCloseAfterLevel(level: number) {
  localStorage.setItem(REBUY_LEVEL_KEY, String(level));
}

/** Fill {level} / {smallBlind} / {bigBlind} / {ante} placeholders. */
export function renderTemplate(
  template: string,
  vars: { level?: number | string; smallBlind?: number | string; bigBlind?: number | string; ante?: number | string }
): string {
  return template
    .replace(/\{level\}/gi, String(vars.level ?? ''))
    .replace(/\{smallBlind\}/gi, String(vars.smallBlind ?? ''))
    .replace(/\{bigBlind\}/gi, String(vars.bigBlind ?? ''))
    .replace(/\{ante\}/gi, String(vars.ante ?? ''));
}
