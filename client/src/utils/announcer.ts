/**
 * Announcer — text-to-speech + audio clip playback for the tournament display.
 *
 * Everything runs in the browser via the Web Speech API, so there are no API
 * keys and no network round-trip. Which voices exist depends on the machine,
 * so the voice is chosen at runtime and remembered per-device.
 */

import { POKER_NOW_START_AUDIO } from '../assets/pokerNowStartAudio';

const VOICE_KEY = 'announcer.voiceURI';
const RATE_KEY = 'announcer.rate';
const PITCH_KEY = 'announcer.pitch';
const ENABLED_KEY = 'announcer.enabled';

export interface AnnouncerSettings {
  voiceURI: string | null;
  rate: number;
  pitch: number;
  enabled: boolean;
}

export function getSettings(): AnnouncerSettings {
  return {
    voiceURI: localStorage.getItem(VOICE_KEY),
    rate: Number(localStorage.getItem(RATE_KEY)) || 0.9,
    pitch: Number(localStorage.getItem(PITCH_KEY)) || 1,
    enabled: localStorage.getItem(ENABLED_KEY) !== 'false',
  };
}

export function saveSettings(patch: Partial<AnnouncerSettings>) {
  if (patch.voiceURI !== undefined) {
    if (patch.voiceURI === null) localStorage.removeItem(VOICE_KEY);
    else localStorage.setItem(VOICE_KEY, patch.voiceURI);
  }
  if (patch.rate !== undefined) localStorage.setItem(RATE_KEY, String(patch.rate));
  if (patch.pitch !== undefined) localStorage.setItem(PITCH_KEY, String(patch.pitch));
  if (patch.enabled !== undefined) localStorage.setItem(ENABLED_KEY, String(patch.enabled));
}

/**
 * Voice lists load asynchronously in most browsers — the first call often
 * returns an empty array, so wait for the voiceschanged event.
 */
export function loadVoices(timeoutMs = 3000): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    if (typeof speechSynthesis === 'undefined') {
      resolve([]);
      return;
    }
    const existing = speechSynthesis.getVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      speechSynthesis.removeEventListener('voiceschanged', finish);
      resolve(speechSynthesis.getVoices());
    };
    speechSynthesis.addEventListener('voiceschanged', finish);
    setTimeout(finish, timeoutMs);
  });
}

/**
 * Known Indian-voice names across platforms, since `lang` alone misses some:
 *  - macOS:        Rishi, Veena, Sangeeta
 *  - Windows:      Heera, Ravi, Priya, Madhur, Swara, Kalpana, Hemant
 *  - Edge/Azure:   Neerja, Prabhat (the "Online (Natural)" neural voices)
 *  - Amazon Polly: Aditi, Raveena, Kajal
 *  - Android:      Aarohi, Isha
 */
const INDIAN_VOICE_NAMES =
  /rishi|veena|sangeeta|heera|ravi|priya|madhur|swara|kalpana|hemant|neerja|prabhat|aditi|raveena|kajal|aarohi|isha|indian/i;

/** True for a voice that speaks Indian-accented English (or Hindi). */
export function isIndianVoice(v: SpeechSynthesisVoice): boolean {
  const lang = (v.lang || '').toLowerCase().replace('_', '-');
  return lang.startsWith('en-in') || lang.startsWith('hi') || INDIAN_VOICE_NAMES.test(v.name || '');
}

/** Edge/Azure "Online (Natural)" voices sound dramatically better than local ones. */
export function isNeuralVoice(v: SpeechSynthesisVoice): boolean {
  return /online|natural|neural/i.test(v.name || '');
}

/**
 * Best Indian voices first: neural Indian English, then any Indian English,
 * then Hindi, then neural English, then the rest.
 */
export function rankVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  const score = (v: SpeechSynthesisVoice) => {
    const lang = (v.lang || '').toLowerCase().replace('_', '-');
    const indianEnglish = lang.startsWith('en-in') || (INDIAN_VOICE_NAMES.test(v.name || '') && lang.startsWith('en'));
    if (indianEnglish && isNeuralVoice(v)) return 0;
    if (indianEnglish) return 1;
    if (lang.startsWith('hi')) return 2;
    if (INDIAN_VOICE_NAMES.test(v.name || '')) return 3;
    if (lang.startsWith('en') && isNeuralVoice(v)) return 4;
    if (lang.startsWith('en')) return 5;
    return 6;
  };
  return [...voices].sort((a, b) => score(a) - score(b) || a.name.localeCompare(b.name));
}

export function pickDefaultVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const ranked = rankVoices(voices);
  return ranked[0] || null;
}

function resolveVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const { voiceURI } = getSettings();
  if (voiceURI) {
    const found = voices.find((v) => v.voiceURI === voiceURI);
    if (found) return found;
  }
  return pickDefaultVoice(voices);
}

// Serialise everything so announcements never overlap each other.
let chain: Promise<void> = Promise.resolve();

function enqueue(task: () => Promise<void>): Promise<void> {
  chain = chain.then(task).catch((err) => {
    console.warn('[announcer] task failed', err);
  });
  return chain;
}

export function speak(text: string): Promise<void> {
  return enqueue(
    () =>
      new Promise<void>((resolve) => {
        const trimmed = (text || '').trim();
        if (!trimmed || !getSettings().enabled || typeof speechSynthesis === 'undefined') {
          resolve();
          return;
        }

        loadVoices().then((voices) => {
          const utterance = new SpeechSynthesisUtterance(trimmed);
          const voice = resolveVoice(voices);
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
          }
          const { rate, pitch } = getSettings();
          utterance.rate = rate;
          utterance.pitch = pitch;

          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          utterance.onend = finish;
          utterance.onerror = finish;

          // Some engines silently drop long utterances; cap the wait so the
          // queue can never deadlock.
          const guardMs = Math.max(5000, trimmed.length * 120);
          setTimeout(finish, guardMs);

          // Chrome occasionally parks the queue in a paused state.
          try {
            speechSynthesis.resume();
          } catch {}
          speechSynthesis.speak(utterance);
        });
      })
  );
}

export function playClip(src: string): Promise<void> {
  return enqueue(
    () =>
      new Promise<void>((resolve) => {
        if (!getSettings().enabled) {
          resolve();
          return;
        }
        try {
          const audio = new Audio(src);
          let settled = false;
          const finish = () => {
            if (settled) return;
            settled = true;
            resolve();
          };
          audio.onended = finish;
          audio.onerror = finish;
          // Clips are short; never let one wedge the queue.
          setTimeout(finish, 30000);
          audio.play().catch(finish);
        } catch {
          resolve();
        }
      })
  );
}

export function stopAll() {
  try {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  } catch {}
  chain = Promise.resolve();
}

/**
 * Browsers block audio until the user interacts with the page. Call this from
 * a real click to unlock both speech and clip playback for the session.
 */
export async function armAudio(): Promise<boolean> {
  try {
    if (typeof speechSynthesis !== 'undefined') {
      const warmup = new SpeechSynthesisUtterance(' ');
      warmup.volume = 0;
      speechSynthesis.speak(warmup);
      speechSynthesis.resume();
    }
    const audio = new Audio(CLIPS.pokerNowStart);
    audio.volume = 0;
    await audio.play().then(() => {
      audio.pause();
      audio.currentTime = 0;
    }).catch(() => {});
    return true;
  } catch {
    return false;
  }
}

export const CLIPS = {
  pokerNowStart: POKER_NOW_START_AUDIO,
} as const;

export type ClipKey = keyof typeof CLIPS;

export function clipSrc(key: string): string | null {
  return (CLIPS as Record<string, string>)[key] || null;
}
