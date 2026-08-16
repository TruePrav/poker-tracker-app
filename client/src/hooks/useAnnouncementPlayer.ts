import { useEffect, useRef } from 'react';
import { fetchPendingAnnouncements, markAnnouncementPlayed } from '../api/announcements';
import { speak, playClip, clipSrc, playIntro } from '../utils/announcer';
import { getIntroSegments } from '../utils/announcementScripts';

const POLL_MS = 3000;

/**
 * Polls the announcement queue and speaks whatever is pending.
 *
 * Any screen can act as the speaker — usually the laptop driving the TV, but
 * the control phone can take over if that display isn't set up. Only enable it
 * on one device at a time or announcements play twice.
 */
export function useAnnouncementPlayer(tournamentId: number | null | undefined, enabled: boolean) {
  const handledRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    if (!tournamentId || !enabled) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const pending = await fetchPendingAnnouncements(tournamentId);
        if (cancelled) return;
        for (const a of pending) {
          if (handledRef.current.has(a.id)) continue;
          handledRef.current.add(a.id);
          // Mark first so an overlapping poll can never replay it.
          markAnnouncementPlayed(tournamentId, a.id).catch(() => {});
          if (a.kind === 'AUDIO' && a.audioKey === 'intro') {
            // The intro is a multi-voice sequence, so it is played from the
            // segments stored on this device rather than as a single clip.
            playIntro(getIntroSegments());
          } else if (a.kind === 'AUDIO' && a.audioKey) {
            const src = clipSrc(a.audioKey);
            if (src) playClip(src);
          } else if (a.text) {
            speak(a.text);
          }
        }
      } catch {
        // Keep polling even if the API blips mid-game.
      }
    };

    poll();
    const handle = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [tournamentId, enabled]);
}
