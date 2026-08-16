import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Volume2, VolumeX, Settings as SettingsIcon, Megaphone } from 'lucide-react';
import { useTournamentStore } from '../stores/useTournamentStore';
import { useTimerStore, selectCurrentBlind, selectNextBlind } from '../stores/useTimerStore';
import { formatCurrencyShort } from '../utils/formatCurrency';
import { formatTime } from '../utils/formatTime';
import { fetchTournament } from '../api/tournaments';
import { fetchPendingAnnouncements, markAnnouncementPlayed } from '../api/announcements';
import { AnnouncerSettings } from '../components/AnnouncerSettings';
import { speak, playClip, playIntro, armAudio, clipSrc, CLIPS, getSettings, saveSettings } from '../utils/announcer';
import { getScripts, getIntroSegments, renderTemplate, getRebuysCloseAfterLevel } from '../utils/announcementScripts';

const ANNOUNCEMENT_POLL_MS = 3000;
const STATE_POLL_MS = 7000;
const TIMER_SYNC_TICKS = 15;

export function FullScreenTimerPage() {
  const { id } = useParams();
  const tournament = useTournamentStore((s) => s.tournament);
  const loadTournament = useTournamentStore((s) => s.loadTournament);
  const syncTimer = useTournamentStore((s) => s.syncTimer);

  const isRunning = useTimerStore((s) => s.isRunning);
  const remainingSeconds = useTimerStore((s) => s.remainingSeconds);
  const currentLevel = useTimerStore((s) => s.currentLevel);
  const blindLevels = useTimerStore((s) => s.blindLevels);
  const currentBlind = useTimerStore(selectCurrentBlind);
  const nextBlind = useTimerStore(selectNextBlind);
  const timerStart = useTimerStore((s) => s.start);
  const timerPause = useTimerStore((s) => s.pause);
  const timerTick = useTimerStore((s) => s.tick);
  const timerNextLevel = useTimerStore((s) => s.nextLevel);
  const initTimer = useTimerStore((s) => s.initializeFromTournament);

  const intervalRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const syncCountRef = useRef(0);
  // Only seed the countdown once per tournament so background polling can
  // never yank the clock out from under a running level.
  const timerSeededForRef = useRef<number | null>(null);
  const prevLevelRef = useRef<number | null>(null);
  const prevStatusRef = useRef<string | null>(null);
  const rebuysClosedRef = useRef(false);
  const handledAnnouncementsRef = useRef<Set<number>>(new Set());

  const [showSettings, setShowSettings] = useState(false);
  const [audioArmed, setAudioArmed] = useState(false);
  const [enabled, setEnabled] = useState(getSettings().enabled);

  useEffect(() => {
    if (id) loadTournament(Number(id));
  }, [id]);

  // Seed the timer once; later polls only refresh display data.
  useEffect(() => {
    if (!tournament?.blindStructure?.levels) return;
    if (timerSeededForRef.current === tournament.id) return;
    timerSeededForRef.current = tournament.id;
    initTimer(tournament.currentLevel, tournament.timerSeconds, tournament.blindStructure.levels);
    prevLevelRef.current = tournament.currentLevel;
    prevStatusRef.current = tournament.status;
  }, [tournament?.id, tournament?.blindStructure?.levels?.length]);

  // Countdown. This display owns the clock and pushes it to the server so the
  // phone can follow along.
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        const levelComplete = timerTick();
        syncCountRef.current++;

        if (levelComplete) {
          const store = useTimerStore.getState();
          const next = store.blindLevels.find((l) => l.level === store.currentLevel + 1);
          if (next) {
            timerNextLevel();
            setTimeout(() => useTimerStore.getState().start(), 2000);
          }
          const s = useTimerStore.getState();
          syncTimer(s.currentLevel, s.remainingSeconds);
          syncCountRef.current = 0;
        }

        if (syncCountRef.current >= TIMER_SYNC_TICKS) {
          syncCountRef.current = 0;
          const s = useTimerStore.getState();
          syncTimer(s.currentLevel, s.remainingSeconds);
        }
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // Speak whenever the level actually advances.
  useEffect(() => {
    const prev = prevLevelRef.current;
    if (prev === null) {
      prevLevelRef.current = currentLevel;
      return;
    }
    if (currentLevel === prev) return;
    prevLevelRef.current = currentLevel;

    const scripts = getScripts();
    const level = blindLevels.find((l) => l.level === currentLevel);
    if (!level) return;

    if (level.isBreak) {
      speak(scripts.breakTime);
    } else {
      speak(
        renderTemplate(scripts.level, {
          level: prev,
          smallBlind: level.smallBlind,
          bigBlind: level.bigBlind,
          ante: level.ante,
        })
      );
    }

    // Rebuys close once a set level finishes (level 6 on tonight's ladder).
    const closeAfter = getRebuysCloseAfterLevel();
    if (closeAfter > 0 && prev <= closeAfter && currentLevel > closeAfter && !rebuysClosedRef.current) {
      rebuysClosedRef.current = true;
      speak(scripts.buyinsClosed);
    }
  }, [currentLevel, blindLevels]);

  // Poll the announcement queue — this is how the phone talks to the TV.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const pending = await fetchPendingAnnouncements(Number(id));
        if (cancelled) return;
        for (const a of pending) {
          if (handledAnnouncementsRef.current.has(a.id)) continue;
          handledAnnouncementsRef.current.add(a.id);
          // Mark first so an overlapping poll can never replay it.
          markAnnouncementPlayed(Number(id), a.id).catch(() => {});
          if (a.kind === 'AUDIO' && a.audioKey) {
            const src = clipSrc(a.audioKey);
            if (src) playClip(src);
          } else if (a.text) {
            speak(a.text);
          }
        }
      } catch {
        // Display keeps running even if the API blips.
      }
    };

    poll();
    const handle = window.setInterval(poll, ANNOUNCEMENT_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [id]);

  // Refresh player count / prize pool as the phone records buy-ins, and fire
  // the intro when the tournament flips to RUNNING.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const fresh = await fetchTournament(Number(id));
        if (cancelled) return;
        useTournamentStore.setState((s) => ({
          tournament: s.tournament ? { ...s.tournament, ...fresh } : fresh,
        }));

        const prevStatus = prevStatusRef.current;
        if (prevStatus && prevStatus !== 'RUNNING' && fresh.status === 'RUNNING') {
          runIntro();
        }
        prevStatusRef.current = fresh.status;
      } catch {
        // ignore
      }
    };

    const handle = window.setInterval(poll, STATE_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [id]);

  // Keep the screen awake while the timer is on the TV.
  useEffect(() => {
    let cancelled = false;
    const acquire = async () => {
      try {
        if ('wakeLock' in navigator) {
          const sentinel = await (navigator as Navigator & {
            wakeLock: { request: (type: 'screen') => Promise<WakeLockSentinel> };
          }).wakeLock.request('screen');
          if (cancelled) {
            sentinel.release().catch(() => {});
            return;
          }
          wakeLockRef.current = sentinel;
        }
      } catch {
        // unsupported or denied — fall back silently
      }
    };
    acquire();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) acquire();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  const runIntro = () => {
    playClip(CLIPS.pokerNowStart);
    playIntro(getIntroSegments());
  };

  const handleArm = async () => {
    await armAudio();
    setAudioArmed(true);
  };

  const toggleEnabled = () => {
    const next = !enabled;
    setEnabled(next);
    saveSettings({ enabled: next });
  };

  let timerColor = 'text-green-400';
  if (remainingSeconds < 30) timerColor = 'text-red-400 animate-pulse';
  else if (remainingSeconds < 120) timerColor = 'text-yellow-400';

  const activePlayers =
    tournament?.entries?.filter((e) => e.status === 'SEATED' || e.status === 'REGISTERED').length || 0;

  return (
    <div
      className="min-h-screen min-h-[100dvh] bg-gray-950 flex flex-col items-center justify-center select-none px-4 py-6 relative"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 1.5rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
      }}
    >
      {/* Controls — deliberately small so they stay out of the way on a TV */}
      <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
        {!audioArmed && (
          <button
            onClick={handleArm}
            className="px-3 py-2 bg-gold hover:bg-gold-light text-gray-900 rounded-lg text-xs font-bold animate-pulse"
          >
            🔊 Enable Sound
          </button>
        )}
        <button
          onClick={runIntro}
          className="p-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg text-gray-300"
          title="Play intro announcement"
          aria-label="Play intro announcement"
        >
          <Megaphone className="w-4 h-4" />
        </button>
        <button
          onClick={toggleEnabled}
          className="p-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg text-gray-300"
          title={enabled ? 'Mute announcements' : 'Unmute announcements'}
          aria-label={enabled ? 'Mute announcements' : 'Unmute announcements'}
        >
          {enabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-400" />}
        </button>
        <button
          onClick={() => setShowSettings(true)}
          className="p-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg text-gray-300"
          title="Announcer settings"
          aria-label="Announcer settings"
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Tap anywhere on the clock area to pause/resume */}
      <div
        className="flex-1 w-full flex flex-col items-center justify-center cursor-pointer"
        onClick={() => (isRunning ? timerPause() : timerStart())}
      >
        <div className="mb-6 sm:mb-8">
          <p
            className={`font-mono font-bold leading-none tracking-wider text-center ${timerColor}`}
            style={{ fontSize: 'clamp(5rem, 28vw, 12rem)' }}
          >
            {formatTime(remainingSeconds)}
          </p>
        </div>

        <div className="text-center mb-6 sm:mb-8 px-2">
          {currentBlind && !currentBlind.isBreak ? (
            <p className="font-bold text-white" style={{ fontSize: 'clamp(1.5rem, 6vw, 3rem)' }}>
              BLINDS: {currentBlind.smallBlind} / {currentBlind.bigBlind}
            </p>
          ) : currentBlind?.isBreak ? (
            <p className="font-bold text-yellow-400" style={{ fontSize: 'clamp(1.5rem, 6vw, 3rem)' }}>
              BREAK
            </p>
          ) : null}
          {currentBlind && currentBlind.ante > 0 && (
            <p className="text-gray-400 mt-1 sm:mt-2" style={{ fontSize: 'clamp(0.875rem, 3vw, 1.5rem)' }}>
              ANTE: {currentBlind.ante}
            </p>
          )}
          {nextBlind && (
            <p className="text-gray-500 mt-2 sm:mt-3" style={{ fontSize: 'clamp(0.75rem, 2.5vw, 1.25rem)' }}>
              NEXT: {nextBlind.isBreak ? 'BREAK' : `${nextBlind.smallBlind} / ${nextBlind.bigBlind}`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-6 sm:gap-12 text-gray-400 flex-wrap justify-center">
          <div className="text-center">
            <p className="font-bold text-white" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>
              {activePlayers}
            </p>
            <p className="text-xs sm:text-sm">Players</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-gold" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>
              {formatCurrencyShort(tournament?.totalPrizePool || 0)}
            </p>
            <p className="text-xs sm:text-sm">Prize Pool</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-white" style={{ fontSize: 'clamp(1.25rem, 5vw, 2rem)' }}>
              {currentLevel} / {blindLevels.length}
            </p>
            <p className="text-xs sm:text-sm">Level</p>
          </div>
        </div>

        {!isRunning && (
          <p className="mt-6 sm:mt-8 text-base sm:text-lg text-gray-600 animate-pulse text-center">
            PAUSED &mdash; Tap to resume
          </p>
        )}
      </div>

      {showSettings && <AnnouncerSettings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
