/**
 * Announcer — text-to-speech + audio clip playback for the tournament display.
 *
 * Speech comes either from the browser's built-in voices (offline, no key) or
 * from ElevenLabs via the server-side proxy. Which browser voices exist depends
 * on the machine, so the voice is chosen at runtime and remembered per-device.
 */

import { POKER_NOW_START_AUDIO } from '../assets/pokerNowStartAudio';
import { SCRATCH_AUDIO } from '../assets/scratchAudio';
import type { IntroSegment } from './announcementScripts';

const VOICE_KEY = 'announcer.voiceURI';
const RATE_KEY = 'announcer.rate';
const PITCH_KEY = 'announcer.pitch';
const ENABLED_KEY = 'announcer.enabled';
const PROVIDER_KEY = 'announcer.provider';
const ELEVEN_VOICE_KEY = 'announcer.elevenVoiceId';

export type Provider = 'browser' | 'elevenlabs';

export function getProvider(): Provider {
  return localStorage.getItem(PROVIDER_KEY) === 'elevenlabs' ? 'elevenlabs' : 'browser';
}

export function setProvider(p: Provider) {
  localStorage.setItem(PROVIDER_KEY, p);
}

export function getElevenVoiceId(): string | null {
  return localStorage.getItem(ELEVEN_VOICE_KEY);
}

export function setElevenVoiceId(id: string | null) {
  if (id) localStorage.setItem(ELEVEN_VOICE_KEY, id);
  else localStorage.removeItem(ELEVEN_VOICE_KEY);
}

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

/**
 * Synthesise via the server-side ElevenLabs proxy. Resolves false if anything
 * goes wrong so the caller can fall back to the browser voice — a failed API
 * call must never mean silence at the table.
 */
async function speakViaElevenLabs(text: string, voiceOverride?: string | null): Promise<boolean> {
  const voiceId = voiceOverride || getElevenVoiceId();
  if (!voiceId) return false;
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voiceId }),
    });
    if (!res.ok) {
      console.warn('[announcer] ElevenLabs failed, falling back', res.status);
      return false;
    }
    const blob = await res.blob();
    if (!blob.size) return false;
    const url = URL.createObjectURL(blob);
    await new Promise<void>((resolve) => {
      const audio = new Audio(url);
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onended = finish;
      audio.onerror = finish;
      setTimeout(finish, 60000);
      audio.play().catch(finish);
    });
    return true;
  } catch (err) {
    console.warn('[announcer] ElevenLabs error, falling back', err);
    return false;
  }
}

function speakWithBrowser(text: string, voiceOverride?: string | null): Promise<void> {
  return new Promise<void>((resolve) => {
    const trimmed = (text || '').trim();
    if (!trimmed || typeof speechSynthesis === 'undefined') {
      resolve();
      return;
    }
    loadVoices().then((voices) => {
      const utterance = new SpeechSynthesisUtterance(trimmed);
      const voice =
        (voiceOverride && voices.find((v) => v.voiceURI === voiceOverride)) || resolveVoice(voices);
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
      const guardMs = Math.max(5000, trimmed.length * 120);
      setTimeout(finish, guardMs);
      try {
        speechSynthesis.resume();
      } catch {}
      speechSynthesis.speak(utterance);
    });
  });
}

/**
 * One line, optionally in a specific voice. Not queued — callers that need
 * ordering either use speak() or run inside a single enqueued task.
 */
async function speakOnce(
  text: string,
  voices?: { voiceURI?: string | null; elevenVoiceId?: string | null }
): Promise<void> {
  const trimmed = (text || '').trim();
  if (!trimmed) return;

  // A per-segment ElevenLabs voice implies ElevenLabs even if the global
  // engine is set to browser, so a mixed-voice intro still works.
  if (getProvider() === 'elevenlabs' || voices?.elevenVoiceId) {
    const ok = await speakViaElevenLabs(trimmed, voices?.elevenVoiceId);
    if (ok) return;
    // fall through to the browser voice
  }
  await speakWithBrowser(trimmed, voices?.voiceURI);
}

export function speak(text: string): Promise<void> {
  return enqueue(async () => {
    if (!getSettings().enabled) return;
    await speakOnce(text);
  });
}

/** Play an audio clip without touching the queue (used inside sequences). */
function playClipOnce(src: string): Promise<void> {
  return new Promise<void>((resolve) => {
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
      setTimeout(finish, 30000);
      audio.play().catch(finish);
    } catch {
      resolve();
    }
  });
}

export const SFX = {
  scratch: SCRATCH_AUDIO,
} as const;

/**
 * Play a multi-segment intro as one uninterrupted sequence: each spoken segment
 * can carry its own voice, and sfx segments drop a clip in between. Queued as a
 * single task so nothing can cut in halfway through.
 */
export function playIntro(segments: IntroSegment[]): Promise<void> {
  return enqueue(async () => {
    if (!getSettings().enabled) return;
    for (const segment of segments) {
      if (segment.kind === 'sfx') {
        await playClipOnce(SFX[segment.sfx || 'scratch'] || SFX.scratch);
      } else {
        await speakOnce(segment.text || '', {
          voiceURI: segment.voiceURI,
          elevenVoiceId: segment.elevenVoiceId,
        });
      }
    }
  });
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
