/**
 * Announcement scripts. Defaults are tuned for tonight's game but every one of
 * these is editable from the display settings panel and stored per-device, so
 * wording can be changed at the table without a redeploy.
 */

const INTRO_KEY = 'announcer.script.intro';
const LEVEL_KEY = 'announcer.script.level';
const BREAK_KEY = 'announcer.script.break';
const BUYINS_KEY = 'announcer.script.buyinsClosed';

export const DEFAULT_INTRO = [
  'Namaskar, ladies and gentlemen, and welcome to the Mahtani Residence!',
  'Tonight we are celebrating A. S. S. BUMP — our August born poker aficionados.',
  'Happy birthday to Amrit, Sunil, Sanjay, and Bhavesh!',
  'Also known as Bare Ass. And Bumpy Ass.',
  'Gentlemen, please reserve your seat, count your chips, and may the flop be with you.',
  'Shuffle up and deal!',
].join(' ');

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
  [INTRO_KEY, LEVEL_KEY, BREAK_KEY, BUYINS_KEY].forEach((k) => localStorage.removeItem(k));
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
