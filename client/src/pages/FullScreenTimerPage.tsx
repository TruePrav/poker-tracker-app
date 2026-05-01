import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useTournamentStore } from '../stores/useTournamentStore';
import { useTimerStore, selectCurrentBlind, selectNextBlind } from '../stores/useTimerStore';
import { formatCurrencyShort } from '../utils/formatCurrency';
import { formatTime } from '../utils/formatTime';

export function FullScreenTimerPage() {
  const { id } = useParams();
  const tournament = useTournamentStore((s) => s.tournament);
  const loadTournament = useTournamentStore((s) => s.loadTournament);

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

  useEffect(() => {
    if (id) loadTournament(Number(id));
  }, [id]);

  useEffect(() => {
    if (tournament?.blindStructure?.levels) {
      initTimer(
        tournament.currentLevel,
        tournament.timerSeconds,
        tournament.blindStructure.levels
      );
    }
  }, [
    tournament?.id,
    tournament?.currentLevel,
    tournament?.timerSeconds,
    tournament?.blindStructure?.id,
    tournament?.blindStructure?.levels?.length,
  ]);

  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        const levelComplete = timerTick();
        if (levelComplete) {
          const next = useTimerStore.getState().blindLevels.find(
            (l) => l.level === useTimerStore.getState().currentLevel + 1
          );
          if (next) {
            timerNextLevel();
            setTimeout(() => useTimerStore.getState().start(), 2000);
          }
        }
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // Keep the device screen awake while the timer is visible.
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
        // wake lock unsupported or denied — silently fall back
      }
    };
    acquire();
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !wakeLockRef.current) {
        acquire();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisible);
      wakeLockRef.current?.release().catch(() => {});
      wakeLockRef.current = null;
    };
  }, []);

  // Click/tap toggles pause/play
  const handleClick = () => {
    isRunning ? timerPause() : timerStart();
  };

  let timerColor = 'text-green-400';
  if (remainingSeconds < 30) timerColor = 'text-red-400 animate-pulse';
  else if (remainingSeconds < 120) timerColor = 'text-yellow-400';

  const activePlayers = tournament?.entries?.filter(
    (e) => e.status === 'SEATED' || e.status === 'REGISTERED'
  ).length || 0;

  return (
    <div
      className="min-h-screen min-h-[100dvh] bg-gray-950 flex flex-col items-center justify-center cursor-pointer select-none px-4 py-6"
      onClick={handleClick}
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 1.5rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 1.5rem)',
      }}
    >
      {/* Timer */}
      <div className="mb-6 sm:mb-8">
        <p
          className={`font-mono font-bold leading-none tracking-wider text-center ${timerColor}`}
          style={{ fontSize: 'clamp(5rem, 28vw, 12rem)' }}
        >
          {formatTime(remainingSeconds)}
        </p>
      </div>

      {/* Blinds */}
      <div className="text-center mb-6 sm:mb-8 px-2">
        {currentBlind && !currentBlind.isBreak ? (
          <p
            className="font-bold text-white"
            style={{ fontSize: 'clamp(1.5rem, 6vw, 3rem)' }}
          >
            BLINDS: {currentBlind.smallBlind} / {currentBlind.bigBlind}
          </p>
        ) : currentBlind?.isBreak ? (
          <p
            className="font-bold text-yellow-400"
            style={{ fontSize: 'clamp(1.5rem, 6vw, 3rem)' }}
          >
            BREAK
          </p>
        ) : null}
        {currentBlind && currentBlind.ante > 0 && (
          <p
            className="text-gray-400 mt-1 sm:mt-2"
            style={{ fontSize: 'clamp(0.875rem, 3vw, 1.5rem)' }}
          >
            ANTE: {currentBlind.ante}
          </p>
        )}
        {nextBlind && (
          <p
            className="text-gray-500 mt-2 sm:mt-3"
            style={{ fontSize: 'clamp(0.75rem, 2.5vw, 1.25rem)' }}
          >
            NEXT: {nextBlind.isBreak ? 'BREAK' : `${nextBlind.smallBlind} / ${nextBlind.bigBlind}`}
          </p>
        )}
      </div>

      {/* Footer Info */}
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

      {/* Pause indicator */}
      {!isRunning && (
        <p className="mt-6 sm:mt-8 text-base sm:text-lg text-gray-600 animate-pulse text-center">
          PAUSED &mdash; Tap to resume
        </p>
      )}
    </div>
  );
}
