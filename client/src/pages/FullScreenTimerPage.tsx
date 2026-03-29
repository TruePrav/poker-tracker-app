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

  // Click to toggle pause/play
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
      className="min-h-screen bg-gray-950 flex flex-col items-center justify-center cursor-pointer select-none"
      onClick={handleClick}
    >
      {/* Timer */}
      <div className="mb-8">
        <p className={`text-[12rem] font-mono font-bold leading-none tracking-wider ${timerColor}`}>
          {formatTime(remainingSeconds)}
        </p>
      </div>

      {/* Blinds */}
      <div className="text-center mb-8">
        {currentBlind && !currentBlind.isBreak ? (
          <p className="text-5xl font-bold text-white">
            BLINDS: {currentBlind.smallBlind} / {currentBlind.bigBlind}
          </p>
        ) : currentBlind?.isBreak ? (
          <p className="text-5xl font-bold text-yellow-400">BREAK</p>
        ) : null}
        {currentBlind && currentBlind.ante > 0 && (
          <p className="text-2xl text-gray-400 mt-2">ANTE: {currentBlind.ante}</p>
        )}
        {nextBlind && (
          <p className="text-xl text-gray-500 mt-3">
            NEXT: {nextBlind.isBreak ? 'BREAK' : `${nextBlind.smallBlind} / ${nextBlind.bigBlind}`}
          </p>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center gap-12 text-gray-400">
        <div className="text-center">
          <p className="text-3xl font-bold text-white">{activePlayers}</p>
          <p className="text-sm">Players</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-gold">
            {formatCurrencyShort(tournament?.totalPrizePool || 0)}
          </p>
          <p className="text-sm">Prize Pool</p>
        </div>
        <div className="text-center">
          <p className="text-3xl font-bold text-white">
            {currentLevel} / {blindLevels.length}
          </p>
          <p className="text-sm">Level</p>
        </div>
      </div>

      {/* Pause indicator */}
      {!isRunning && (
        <p className="mt-8 text-lg text-gray-600 animate-pulse">PAUSED - Click to resume</p>
      )}
    </div>
  );
}
