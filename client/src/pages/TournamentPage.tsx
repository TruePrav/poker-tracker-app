import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams } from 'react-router-dom';
import { AlertTriangle, ArrowRightLeft, DollarSign, Pause, Play, Plus, Minus, SkipForward, SkipBack, RotateCcw, UserX, MonitorPlay, Trophy, Undo2, Coins, X } from 'lucide-react';
import { useTournamentStore } from '../stores/useTournamentStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { fetchBlindStructures } from '../api/blinds';
import { fetchTournament as fetchTournamentById } from '../api/tournaments';
import { useTimerStore, selectCurrentBlind, selectNextBlind } from '../stores/useTimerStore';
import { formatCurrencyShort } from '../utils/formatCurrency';
import { formatTime } from '../utils/formatTime';
import type { BlindStructure, TournamentTable } from 'shared';
import { MAX_SEATS_PER_TABLE } from 'shared';
import { AnnouncePanel } from '../components/AnnouncePanel';

export function TournamentPage() {
  const { id } = useParams();
  const tournament = useTournamentStore((s) => s.tournament);
  const loadTournament = useTournamentStore((s) => s.loadTournament);
  const balanceSuggestion = useTournamentStore((s) => s.balanceSuggestion);
  const movePlayer = useTournamentStore((s) => s.movePlayer);
  const createTable = useTournamentStore((s) => s.createTable);
  const shuffleSeats = useTournamentStore((s) => s.shuffleSeats);
  const addEntry = useTournamentStore((s) => s.addEntry);
  const eliminatePlayer = useTournamentStore((s) => s.eliminatePlayer);
  const recordBuyIn = useTournamentStore((s) => s.recordBuyIn);
  const recordRebuy = useTournamentStore((s) => s.recordRebuy);
  const recordTopUp = useTournamentStore((s) => s.recordTopUp);
  const checkBalance = useTournamentStore((s) => s.checkBalance);
  const updateStatus = useTournamentStore((s) => s.updateStatus);
  const updateSettings = useTournamentStore((s) => s.updateSettings);
  const syncTimer = useTournamentStore((s) => s.syncTimer);
  const undoTransaction = useTournamentStore((s) => s.undoTransaction);
  const players = usePlayerStore((s) => s.players);
  const fetchPlayers = usePlayerStore((s) => s.fetchPlayers);

  const isRunning = useTimerStore((s) => s.isRunning);
  const remainingSeconds = useTimerStore((s) => s.remainingSeconds);
  const currentLevel = useTimerStore((s) => s.currentLevel);
  const blindLevels = useTimerStore((s) => s.blindLevels);
  const currentBlind = useTimerStore(selectCurrentBlind);
  const nextBlind = useTimerStore(selectNextBlind);
  const timerStart = useTimerStore((s) => s.start);
  const timerPause = useTimerStore((s) => s.pause);
  const timerTick = useTimerStore((s) => s.tick);
  const timerAdjust = useTimerStore((s) => s.adjustTime);
  const timerNextLevel = useTimerStore((s) => s.nextLevel);
  const timerPrevLevel = useTimerStore((s) => s.previousLevel);
  const timerResetLevel = useTimerStore((s) => s.resetLevel);
  const initTimer = useTimerStore((s) => s.initializeFromTournament);

  const intervalRef = useRef<number | null>(null);
  const syncCountRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [showEliminate, setShowEliminate] = useState(false);
  const [eliminateConfirm, setEliminateConfirm] = useState<{ playerId: number; name: string } | null>(null);
  const [isEliminating, setIsEliminating] = useState(false);
  const [showRebuy, setShowRebuy] = useState(false);
  const [showTopUp, setShowTopUp] = useState(false);
  const [showPayout, setShowPayout] = useState(false);
  const [showChipCount, setShowChipCount] = useState(false);
  const [balancePlan, setBalancePlan] = useState<ReturnType<typeof buildBalancePlan>>(null);
  const [payoutStep, setPayoutStep] = useState<1 | 2>(1);
  const [chipCounts, setChipCounts] = useState<Record<number, string>>({});
  const [payoutAmounts, setPayoutAmounts] = useState<Record<number, string>>({});
  const [selectedLateBuyInPlayerId, setSelectedLateBuyInPlayerId] = useState<string>('');
  const [manualSeatPlayerId, setManualSeatPlayerId] = useState<string>('');
  const [showLiveSettings, setShowLiveSettings] = useState(false);
  const [allBlindStructures, setAllBlindStructures] = useState<BlindStructure[]>([]);
  const [liveBlindStructureId, setLiveBlindStructureId] = useState<string>('');
  const [liveLevel, setLiveLevel] = useState<string>('1');
  const [liveTimerSeconds, setLiveTimerSeconds] = useState<string>('0');
  const [isApplyingLiveSettings, setIsApplyingLiveSettings] = useState(false);
  const [isBalancing, setIsBalancing] = useState(false);
  const [isAddingTable, setIsAddingTable] = useState(false);
  // Break overlay
  const [breakDismissed, setBreakDismissed] = useState(false);
  const prevIsBreakRef = useRef(false);
  // Variable rebuy modal
  const [showVariableRebuy, setShowVariableRebuy] = useState(false);
  const [variableRebuyPlayerId, setVariableRebuyPlayerId] = useState<number | null>(null);
  const [customRebuyAmount, setCustomRebuyAmount] = useState('');

  useEffect(() => {
    if (id) loadTournament(Number(id));
    fetchPlayers();
    fetchBlindStructures().then(setAllBlindStructures).catch(() => {});
  }, [id]);

  // Follow whichever device is driving the clock (typically the TV display).
  // Skipped while this device's own timer is running so a phone-only setup
  // still works without the two fighting over the countdown.
  useEffect(() => {
    if (!id) return;
    if (isRunning) return;
    let cancelled = false;

    const poll = async () => {
      try {
        const fresh = await fetchTournamentById(Number(id));
        if (cancelled) return;
        useTournamentStore.setState((s) => ({
          tournament: s.tournament ? { ...s.tournament, ...fresh } : fresh,
        }));
      } catch {
        // keep the control screen usable if the API blips
      }
    };

    const handle = window.setInterval(poll, 7000);
    return () => {
      cancelled = true;
      clearInterval(handle);
    };
  }, [id, isRunning]);

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
    if (!tournament) return;
    setLiveBlindStructureId(tournament.blindStructureId ? String(tournament.blindStructureId) : '');
    setLiveLevel(String(tournament.currentLevel || 1));
    setLiveTimerSeconds(String(tournament.timerSeconds || 0));
  }, [tournament?.id, tournament?.blindStructureId, tournament?.currentLevel, tournament?.timerSeconds]);

  // Reset break dismissed when break starts
  useEffect(() => {
    const isBreak = currentBlind?.isBreak ?? false;
    if (isBreak && !prevIsBreakRef.current) {
      setBreakDismissed(false);
    }
    prevIsBreakRef.current = isBreak;
  }, [currentBlind?.isBreak]);

  // Timer tick
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = window.setInterval(() => {
        const levelComplete = timerTick();
        syncCountRef.current++;

        if (levelComplete) {
          // Play sound
          try {
            if (!audioRef.current) {
              audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1ubH+Kj4eBd2xzf4yTjYJ3bHWAjpOPh310c3+MkY+EeHF0gI6Sk4d7dHF+jJGQhHlxdICNk5KHenNyfouRj4R5cXSAjZOSiHp0cn6LkI+EeXF0gI2SkYh6dHJ+i5CPhHlxdH+NkpKIenRyfouQj4R5cXR/jZKSiHpzcn6LkI+EeXF0f42Skoj6c3J+i5CPhHlxdH+NkpKI+nNyfouQj4R5cXR/jZKSiHp0cn6LkI+EeXF0f42Skoh6dHJ+i5CPhHlxdH+NkpGIenRyfouQj4V5cXR/jZKRiHp0cn6LkI+FeXF0f4ySkYh6dHJ+i5CPhXlxdH+MkpGIenRyfouQj4V5cXR/jJKRiHp0cn6LkI+FeXF0f4ySkYh6dHJ/i5CPhXlxdH+MkZGIenRyf4uPj4V5cXR/jJGRiHp0cn+Lj4+FeXFzf4yRkYh6dHJ/i4+PhXlxc3+MkZGIenRyf4uPj4V5cXN/jJGRiHp0cn+Lj4+FeXFzf4yRkYl6dHJ/i4+PhXlxc3+MkZCJenRyf4uPj4V5cXN/jJGQiXp0cn+Lj4+FeXFzf4yRkIl6dHJ/i4+PhXlxc3+MkZCJenRyf4uPj4V5cXN/jJGQiXp0cn+Lj4+FeXFzf4yRkIl6dHJ/i4+PhXlxc3+MkZCJenRyf4uPj4V5cXN/jJGQiXp0cn+Lj4+FeXFzf4yRkIl6dHJ/i4+PhXlxc3+MkZCJ');
            }
            audioRef.current.play().catch(() => {});
          } catch {}

          // Auto advance to next level
          const nextStore = useTimerStore.getState();
          const next = nextStore.blindLevels.find(l => l.level === nextStore.currentLevel + 1);
          if (next) {
            timerNextLevel();
          }
        }

        // Sync to server every 30 ticks (30 seconds)
        if (syncCountRef.current >= 30) {
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

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleToggleTimer();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleToggleTimer]);

  const activePlayers = (tournament?.entries || []).filter(
    (e) => e.status === 'SEATED' || e.status === 'REGISTERED'
  );
  const eliminatedPlayers = (tournament?.entries || []).filter((e) => e.status === 'ELIMINATED');

  // Timer color
  let timerColor = 'text-green-400';
  let timerBg = 'bg-green-900/20';
  if (remainingSeconds < 30) {
    timerColor = 'text-red-400 animate-pulse';
    timerBg = 'bg-red-900/30';
  } else if (remainingSeconds < 120) {
    timerColor = 'text-yellow-400';
    timerBg = 'bg-yellow-900/20';
  }

  const isFinished = tournament?.status === 'FINISHED';
  const registeredPlayerIds = new Set((tournament?.entries || []).map((e) => e.playerId));
  const lateBuyInCandidates = players.filter((p) => !registeredPlayerIds.has(p.id));
  const buyAndRebuyTransactions = (tournament?.transactions || [])
    .filter((tx) => tx.type === 'BUY_IN' || tx.type === 'REBUY')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const playersWithTopUp = new Set(
    (tournament?.transactions || []).filter((tx) => tx.type === 'TOP_UP').map((tx) => tx.playerId)
  );

  /**
   * Side pots come out of the first buy-in only: $20 bounty and $20 ASS pot per
   * player. Everything else (rebuys, add-ons) is pure main pot. Amounts are in
   * cents, matching totalPrizePool.
   */
  const BOUNTY_PER_PLAYER = 2000;
  const ASS_POT_PER_PLAYER = 2000;
  const firstBuyInCount = (tournament?.transactions || []).filter((tx) => tx.type === 'BUY_IN').length;
  const bountyPot = firstBuyInCount * BOUNTY_PER_PLAYER;
  const assPot = firstBuyInCount * ASS_POT_PER_PLAYER;
  // Never let the side pots push the main pot negative on a half-entered game.
  const mainPot = Math.max(0, (tournament?.totalPrizePool || 0) - bountyPot - assPot);

  const getSeatForLateBuyIn = useCallback((tablesInput?: TournamentTable[]) => {
    const tables = tablesInput || tournament?.tables || [];
    if (tables.length === 0) {
      return null;
    }

    const sortedByLoad = [...tables].sort((a, b) => {
      const aCount = (a.entries || []).filter((e) => e.status === 'SEATED').length;
      const bCount = (b.entries || []).filter((e) => e.status === 'SEATED').length;
      return aCount - bCount;
    });

    for (const table of sortedByLoad) {
      const occupied = new Set((table.entries || []).filter((e) => e.status === 'SEATED').map((e) => e.seatNumber));
      for (let seat = 1; seat <= MAX_SEATS_PER_TABLE; seat++) {
        if (!occupied.has(seat)) {
          return { tableId: table.id, seatNumber: seat };
        }
      }
    }
    return null;
  }, [tournament?.tables]);

  async function handleToggleTimer() {
    if (isFinished) return;
    if (isRunning) {
      timerPause();
      const state = useTimerStore.getState();
      await syncTimer(state.currentLevel, state.remainingSeconds);
      if (tournament?.status === 'RUNNING') {
        await updateStatus('PAUSED');
      }
      return;
    }
    timerStart();
    const state = useTimerStore.getState();
    await syncTimer(state.currentLevel, state.remainingSeconds);
    if (tournament?.status !== 'RUNNING') {
      await updateStatus('RUNNING');
    }
  }

  const handleLateBuyIn = useCallback(async () => {
    const playerId = Number(selectedLateBuyInPlayerId);
    if (!playerId) return;
    await addEntry(playerId);
    await recordBuyIn(playerId);
    const latestTournament = useTournamentStore.getState().tournament;
    const seat = getSeatForLateBuyIn(latestTournament?.tables);
    if (seat) {
      await movePlayer(playerId, seat.tableId, seat.seatNumber);
    }
    await checkBalance();
    setSelectedLateBuyInPlayerId('');
  }, [selectedLateBuyInPlayerId, addEntry, recordBuyIn, getSeatForLateBuyIn, movePlayer, checkBalance]);

  const handleFinish = async () => {
    timerPause();
    setPayoutStep(1);
    setChipCounts({});
    setPayoutAmounts({});
    setShowPayout(true);
  };

  const handleConfirmPayouts = async () => {
    for (const [pidStr, amountStr] of Object.entries(payoutAmounts)) {
      const amount = Math.round(parseFloat(amountStr || '0') * 100);
      if (amount > 0) {
        await useTournamentStore.getState().recordPayout(Number(pidStr), amount);
      }
    }
    await updateStatus('FINISHED');
    setShowPayout(false);
    loadTournament(tournament!.id);
  };

  const handleReshuffleTables = useCallback(async () => {
    const neededTables = Math.max(1, Math.ceil(activePlayers.length / MAX_SEATS_PER_TABLE));
    const existingTables = tournament?.tables || [];

    if (existingTables.length < neededTables) {
      let nextTableNumber =
        existingTables.length > 0 ? Math.max(...existingTables.map((t) => t.tableNumber)) + 1 : 1;
      for (let i = existingTables.length; i < neededTables; i++) {
        await createTable(nextTableNumber, `Table ${nextTableNumber}`);
        nextTableNumber++;
      }
    }

    await shuffleSeats();
    await checkBalance();
  }, [activePlayers.length, tournament?.tables, createTable, shuffleSeats, checkBalance]);

  const handleAddTable = useCallback(async () => {
    if (isAddingTable) return;
    setIsAddingTable(true);
    try {
      const existing = tournament?.tables || [];
      const nextNumber = existing.length > 0 ? Math.max(...existing.map((t) => t.tableNumber)) + 1 : 1;
      await createTable(nextNumber, `Table ${nextNumber}`);
      await loadTournament(tournament!.id);
    } finally {
      setIsAddingTable(false);
    }
  }, [isAddingTable, tournament?.tables, tournament?.id, createTable, loadTournament]);

  const handleManualSeatClick = useCallback(
    async (tableId: number, seatNumber: number, occupied: boolean, seatedPlayerId?: number) => {
      // Tapping a seated player picks them up; tapping them again puts them
      // back down. With someone held, any empty seat on any table is a valid
      // destination, which is how a player gets moved across tables.
      if (occupied) {
        if (!seatedPlayerId) return;
        setManualSeatPlayerId((current) =>
          Number(current) === seatedPlayerId ? '' : String(seatedPlayerId)
        );
        return;
      }

      if (!manualSeatPlayerId) return;
      const playerId = Number(manualSeatPlayerId);
      if (!playerId) return;

      const alreadyInTournament = (tournament?.entries || []).some((e) => e.playerId === playerId);
      if (!alreadyInTournament) {
        await addEntry(playerId);
        await recordBuyIn(playerId);
      }

      await movePlayer(playerId, tableId, seatNumber);
      await checkBalance();
      setManualSeatPlayerId('');
    },
    [manualSeatPlayerId, tournament?.entries, addEntry, recordBuyIn, movePlayer, checkBalance]
  );

  /**
   * Work out the moves that would even out the tables, without performing any
   * of them. Returns the move list plus what each table would look like after,
   * so the plan can be shown before it is committed.
   *
   * Seats are balanced first, since that is what actually matters. Where there
   * is a choice of who to move, the biggest stacks go to the lightest table, so
   * a break-time count also evens out the chips instead of moving someone at
   * random.
   */
  const buildBalancePlan = useCallback(() => {
    const tables = (tournament?.tables || []).map((t) => ({
      id: t.id,
      tableNumber: t.tableNumber,
      seated: (t.entries || []).filter((e) => e.status === 'SEATED'),
    }));
    if (tables.length < 2) return null;

    const totalSeated = tables.reduce((sum, t) => sum + t.seated.length, 0);
    if (totalSeated === 0) return null;

    const chipsOf = (playerId: number) => parseInt(chipCounts[playerId] || '0') || 0;
    const chipsOfTable = (seated: { playerId: number }[]) =>
      seated.reduce((sum, e) => sum + chipsOf(e.playerId), 0);

    const base = Math.floor(totalSeated / tables.length);
    let remainder = totalSeated % tables.length;
    const targets = new Map<number, number>();
    for (const t of [...tables].sort((a, b) => b.seated.length - a.seated.length)) {
      targets.set(t.id, base + (remainder > 0 ? 1 : 0));
      if (remainder > 0) remainder--;
    }

    const deficits: Array<{ tableId: number; tableNumber: number; seats: number[]; chips: number }> = [];
    const surpluses: Array<{
      tableNumber: number;
      movers: Array<{ playerId: number; name: string; seatNumber: number | null; chips: number }>;
    }> = [];

    for (const t of tables) {
      const target = targets.get(t.id) || 0;
      const diff = t.seated.length - target;
      if (diff < 0) {
        const occupied = new Set(t.seated.map((e) => e.seatNumber));
        const openSeats: number[] = [];
        for (let s = 1; s <= MAX_SEATS_PER_TABLE; s++) if (!occupied.has(s)) openSeats.push(s);
        deficits.push({
          tableId: t.id,
          tableNumber: t.tableNumber,
          seats: openSeats.slice(0, Math.abs(diff)),
          chips: chipsOfTable(t.seated),
        });
      } else if (diff > 0) {
        // Biggest stacks move first so they can be sent to the lightest table.
        const candidates = t.seated
          .map((e) => ({
            playerId: e.playerId,
            name: e.player?.name || `#${e.playerId}`,
            seatNumber: e.seatNumber,
            chips: chipsOf(e.playerId),
          }))
          .sort((a, b) => b.chips - a.chips);
        surpluses.push({ tableNumber: t.tableNumber, movers: candidates.slice(0, diff) });
      }
    }

    const moves: Array<{
      playerId: number;
      name: string;
      chips: number;
      fromTableNumber: number;
      fromSeat: number | null;
      toTableId: number;
      toTableNumber: number;
      toSeat: number;
    }> = [];

    for (const source of surpluses) {
      for (const mover of source.movers) {
        // Lightest table with a free seat wins the biggest remaining stack.
        const target = deficits
          .filter((d) => d.seats.length > 0)
          .sort((a, b) => a.chips - b.chips)[0];
        if (!target) break;
        const toSeat = target.seats.shift();
        if (!toSeat) continue;
        target.chips += mover.chips;
        moves.push({
          playerId: mover.playerId,
          name: mover.name,
          chips: mover.chips,
          fromTableNumber: source.tableNumber,
          fromSeat: mover.seatNumber,
          toTableId: target.tableId,
          toTableNumber: target.tableNumber,
          toSeat,
        });
      }
    }

    const movedIds = new Set(moves.map((m) => m.playerId));
    const after = tables.map((t) => {
      const staying = t.seated.filter((e) => !movedIds.has(e.playerId));
      const arriving = moves.filter((m) => m.toTableId === t.id);
      return {
        tableNumber: t.tableNumber,
        before: { players: t.seated.length, chips: chipsOfTable(t.seated) },
        after: {
          players: staying.length + arriving.length,
          chips: chipsOfTable(staying) + arriving.reduce((s, m) => s + m.chips, 0),
        },
      };
    });

    return { moves, after };
  }, [tournament?.tables, chipCounts]);

  const applyBalancePlan = useCallback(
    async (moves: Array<{ playerId: number; toTableId: number; toSeat: number }>) => {
      if (isBalancing) return;
      setIsBalancing(true);
      try {
        for (const move of moves) {
          await movePlayer(move.playerId, move.toTableId, move.toSeat);
        }
        await checkBalance();
      } finally {
        setIsBalancing(false);
      }
    },
    [isBalancing, movePlayer, checkBalance]
  );

  const handleMinimalBalance = useCallback(async () => {
    const plan = buildBalancePlan();
    if (!plan) return;
    await applyBalancePlan(plan.moves);
  }, [buildBalancePlan, applyBalancePlan]);

  const handleRebuyClick = useCallback((playerId: number) => {
    if (tournament?.buyInType === 'VARIABLE') {
      setVariableRebuyPlayerId(playerId);
      setCustomRebuyAmount('');
      setShowVariableRebuy(true);
    } else {
      recordRebuy(playerId);
    }
  }, [tournament?.buyInType, recordRebuy]);

  const handleVariableRebuyConfirm = useCallback(async (amountCents: number) => {
    if (variableRebuyPlayerId == null) return;
    await recordRebuy(variableRebuyPlayerId, amountCents);
    setShowVariableRebuy(false);
    setVariableRebuyPlayerId(null);
  }, [variableRebuyPlayerId, recordRebuy]);

  const handleApplyLiveSettings = useCallback(async () => {
    if (!tournament) return;
    setIsApplyingLiveSettings(true);
    try {
      const selectedStructureId = liveBlindStructureId ? Number(liveBlindStructureId) : null;
      const selectedStructure = allBlindStructures.find((s) => s.id === selectedStructureId);
      const maxLevel = selectedStructure?.levels?.length || blindLevels.length || 1;
      const parsedLevel = Number(liveLevel) || 1;
      const clampedLevel = Math.min(Math.max(1, parsedLevel), maxLevel);

      let parsedSeconds = Number(liveTimerSeconds);
      if (!Number.isFinite(parsedSeconds) || parsedSeconds < 0) {
        parsedSeconds = 0;
      }
      if (parsedSeconds === 0) {
        const levelDef =
          selectedStructure?.levels?.find((l) => l.level === clampedLevel) ||
          blindLevels.find((l) => l.level === clampedLevel);
        if (levelDef) {
          parsedSeconds = levelDef.durationMinutes * 60;
        }
      }

      await updateSettings({ blindStructureId: selectedStructureId });
      await syncTimer(clampedLevel, parsedSeconds);
      await loadTournament(tournament!.id);
      setShowLiveSettings(false);
    } finally {
      setIsApplyingLiveSettings(false);
    }
  }, [
    tournament,
    liveBlindStructureId,
    liveLevel,
    liveTimerSeconds,
    allBlindStructures,
    blindLevels,
    updateSettings,
    syncTimer,
    loadTournament,
  ]);

  if (!tournament) {
    return <div className="p-4 sm:p-8 text-gray-400">Loading tournament...</div>;
  }

  return (
    <div className="lg:h-screen flex flex-col lg:overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 bg-gray-900 border-b border-gray-800">
        <div className="min-w-0 flex-1">
          <h1 className="text-base sm:text-lg font-bold text-white truncate">{tournament.name}</h1>
          <p className="text-[11px] sm:text-xs text-gray-400 truncate">
            {activePlayers.length} players &middot; Level {currentLevel}/{blindLevels.length}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
          <div className="text-right">
            <p className="text-[10px] sm:text-xs text-gray-400">Main Pot</p>
            <p className="text-base sm:text-xl font-bold text-gold">{formatCurrencyShort(mainPot)}</p>
            <p className="text-[9px] sm:text-[10px] text-gray-500 leading-tight">
              +{formatCurrencyShort(bountyPot)} bounty &middot; +{formatCurrencyShort(assPot)} ASS
            </p>
          </div>
          <a
            href={`/tournament/${tournament.id}/timer`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
            title="Open full-screen timer"
          >
            <MonitorPlay className="w-5 h-5" />
          </a>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row lg:overflow-hidden">
        {/* Left: Timer */}
        <div className="w-full lg:w-[420px] lg:flex-shrink-0 border-b lg:border-b-0 lg:border-r border-gray-800 flex flex-col p-4 sm:p-6 gap-4 relative">
          {/* Break Overlay */}
          {currentBlind?.isBreak && !breakDismissed && (
            <div className="absolute inset-0 z-20 bg-gray-900/95 flex flex-col items-center justify-center gap-4 sm:gap-6 p-4 sm:p-6">
              <p className="text-3xl sm:text-5xl font-bold text-yellow-400 animate-pulse">BREAK TIME</p>
              <p className={`text-5xl sm:text-6xl font-mono font-bold tracking-wider ${timerColor}`}>
                {formatTime(remainingSeconds)}
              </p>
              <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
                <button
                  onClick={() => timerAdjust(300)}
                  className="px-3 sm:px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg text-xs sm:text-sm font-medium"
                >
                  Extend +5 min
                </button>
                <button
                  onClick={() => timerAdjust(600)}
                  className="px-3 sm:px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg text-xs sm:text-sm font-medium"
                >
                  Extend +10 min
                </button>
              </div>
              <div className="flex gap-2 sm:gap-3 flex-wrap justify-center">
                <button
                  onClick={() => timerNextLevel()}
                  className="px-3 sm:px-4 py-2 bg-felt hover:bg-felt-dark text-white rounded-lg text-xs sm:text-sm font-medium"
                >
                  Skip Break
                </button>
                <button
                  onClick={() => setBreakDismissed(true)}
                  className="px-3 sm:px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs sm:text-sm font-medium"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Timer Display */}
          <div className={`rounded-2xl p-4 sm:p-8 text-center ${timerBg}`}>
            <p className={`font-mono font-bold tracking-wider ${timerColor}`}
               style={{ fontSize: 'clamp(3.5rem, 14vw, 6rem)' }}>
              {formatTime(remainingSeconds)}
            </p>
          </div>

          {/* Blind Info */}
          <div className="text-center">
            {currentBlind && !currentBlind.isBreak ? (
              <>
                <p className="text-xl sm:text-2xl font-bold text-white">
                  {currentBlind.smallBlind} / {currentBlind.bigBlind}
                </p>
                {currentBlind.ante > 0 && (
                  <p className="text-xs sm:text-sm text-gray-400">Ante: {currentBlind.ante}</p>
                )}
              </>
            ) : currentBlind?.isBreak ? (
              <p className="text-xl sm:text-2xl font-bold text-yellow-400">BREAK</p>
            ) : null}
            {nextBlind && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                Next: {nextBlind.isBreak ? 'BREAK' : `${nextBlind.smallBlind}/${nextBlind.bigBlind}`}
              </p>
            )}
          </div>

          {/* Timer Controls */}
          <div className="flex items-center justify-center gap-2">
            <button onClick={timerPrevLevel} className="p-2.5 sm:p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400" title="Previous level" aria-label="Previous level">
              <SkipBack className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
            <button onClick={() => timerAdjust(-60)} className="p-2.5 sm:p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400" title="-1 min" aria-label="Subtract 1 minute">
              <Minus className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={handleToggleTimer}
              className={`px-5 sm:px-6 py-3 rounded-xl font-semibold text-sm flex items-center gap-2 ${
                isRunning
                  ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                  : 'bg-felt hover:bg-felt-dark text-white'
              }`}
            >
              {isRunning ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              {isRunning ? 'Pause' : 'Start'}
            </button>
            <button onClick={() => timerAdjust(60)} className="p-2.5 sm:p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400" title="+1 min" aria-label="Add 1 minute">
              <Plus className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
            <button onClick={timerNextLevel} className="p-2.5 sm:p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400" title="Next level" aria-label="Next level">
              <SkipForward className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          </div>
          <button onClick={timerResetLevel} className="text-xs text-gray-500 hover:text-gray-400 flex items-center justify-center gap-1">
            <RotateCcw className="w-3 h-3" /> Reset Level
          </button>

          <div className="border border-gray-800 rounded-xl p-3 bg-gray-900/60">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Live Settings</p>
              <button
                onClick={() => setShowLiveSettings((v) => !v)}
                className="text-xs px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded text-gray-300"
              >
                {showLiveSettings ? 'Hide' : 'Edit'}
              </button>
            </div>

            {showLiveSettings && (
              <div className="mt-3 space-y-2">
                <div>
                  <label className="block text-[11px] text-gray-500 mb-1">Blind Structure</label>
                  <select
                    value={liveBlindStructureId}
                    onChange={(e) => setLiveBlindStructureId(e.target.value)}
                    className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-felt"
                  >
                    <option value="">None</option>
                    {allBlindStructures.map((s) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Current Level</label>
                    <input
                      type="number"
                      min={1}
                      value={liveLevel}
                      onChange={(e) => setLiveLevel(e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-felt"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-gray-500 mb-1">Timer (seconds)</label>
                    <input
                      type="number"
                      min={0}
                      value={liveTimerSeconds}
                      onChange={(e) => setLiveTimerSeconds(e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-felt"
                    />
                  </div>
                </div>

                <button
                  onClick={handleApplyLiveSettings}
                  disabled={isApplyingLiveSettings}
                  className="w-full mt-1 px-3 py-2 bg-felt hover:bg-felt-dark disabled:opacity-60 text-white rounded text-xs font-semibold"
                >
                  {isApplyingLiveSettings ? 'Applying...' : 'Apply Live Settings'}
                </button>
              </div>
            )}
          </div>

          {/* Upcoming Levels */}
          <div className="flex-1 overflow-y-auto">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Upcoming</h4>
            <div className="space-y-1">
              {blindLevels
                .filter((l) => l.level >= currentLevel)
                .slice(0, 8)
                .map((l) => (
                  <div
                    key={l.level}
                    className={`flex items-center justify-between px-3 py-1.5 rounded text-xs ${
                      l.level === currentLevel
                        ? 'bg-felt/20 text-felt font-semibold'
                        : l.isBreak
                        ? 'bg-yellow-900/10 text-yellow-600'
                        : 'text-gray-500'
                    }`}
                  >
                    <span>Lvl {l.level}</span>
                    <span>{l.isBreak ? 'BREAK' : `${l.smallBlind}/${l.bigBlind}`}</span>
                    <span>{l.durationMinutes}m</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right: Tables */}
        <div className="flex-1 flex flex-col lg:overflow-hidden">
          {/* Balance Alert */}
          {balanceSuggestion && (
            <div className="mx-4 sm:mx-6 mt-4 p-3 sm:p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-yellow-300">
                  Tables unbalanced! Move <strong>{balanceSuggestion.playerName}</strong> from Table{' '}
                  {balanceSuggestion.fromTableNumber} to Table {balanceSuggestion.toTableNumber} (seat{' '}
                  {balanceSuggestion.suggestedSeat}).
                </p>
              </div>
              <button
                onClick={async () => {
                  await movePlayer(
                    balanceSuggestion.playerId,
                    balanceSuggestion.toTableId,
                    balanceSuggestion.suggestedSeat
                  );
                  await checkBalance();
                }}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg text-xs font-medium flex items-center justify-center gap-1 flex-shrink-0 self-end sm:self-center"
              >
                <ArrowRightLeft className="w-3 h-3" /> Move
              </button>
            </div>
          )}

          {/* Move hint — shown while a player is picked up */}
          {manualSeatPlayerId && (
            <div className="mx-4 sm:mx-6 mt-4 p-3 bg-gold/10 border border-gold/50 rounded-xl flex items-center justify-between gap-3">
              <p className="text-xs sm:text-sm text-gold">
                <strong>
                  {players.find((p) => p.id === Number(manualSeatPlayerId))?.name || 'Player'}
                </strong>{' '}
                picked up. Tap any empty seat, on any table, to move them there.
              </p>
              <button
                onClick={() => setManualSeatPlayerId('')}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded-lg text-xs font-medium flex-shrink-0"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Table Grid */}
          <div className="flex-1 lg:overflow-y-auto p-4 sm:p-6">
            <div className={`grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 ${(tournament.tables?.length || 0) > 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'}`}>
              {tournament.tables?.map((table) => {
                const seated = table.entries?.filter((e) => e.status === 'SEATED') || [];
                return (
                  <div key={table.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-white">Table {table.tableNumber}</h3>
                      <span className="text-xs text-gray-500">{seated.length}/{MAX_SEATS_PER_TABLE}</span>
                    </div>

                    {/* Oval Table Visualization */}
                    <div className="relative w-full aspect-[4/3]">
                      {/* Felt oval */}
                      <div className="absolute inset-4 bg-felt/30 border-2 border-felt/50 rounded-[50%]" />

                      {/* Seats around the oval */}
                      {Array.from({ length: MAX_SEATS_PER_TABLE }, (_, i) => {
                        const seatNum = i + 1;
                        const entry = table.entries?.find((e) => e.seatNumber === seatNum && e.status === 'SEATED');
                        // Position seats in an oval
                        const angle = (i / MAX_SEATS_PER_TABLE) * 2 * Math.PI - Math.PI / 2;
                        const rx = 45; // % radius x
                        const ry = 42; // % radius y
                        const cx = 50 + rx * Math.cos(angle);
                        const cy = 50 + ry * Math.sin(angle);

                        return (
                          <div
                            key={seatNum}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2"
                            style={{ left: `${cx}%`, top: `${cy}%` }}
                          >
                            <div
                              onClick={() =>
                                handleManualSeatClick(table.id, seatNum, Boolean(entry), entry?.playerId)
                              }
                              title={entry ? `Tap to move ${entry.player?.name || 'player'}` : 'Empty seat'}
                              className={`w-14 h-10 rounded-lg flex flex-col items-center justify-center text-[10px] leading-tight ${
                                entry
                                  ? Number(manualSeatPlayerId) === entry.playerId
                                    ? 'bg-gold text-gray-900 border border-gold ring-2 ring-gold/50 cursor-pointer font-bold'
                                    : 'bg-gray-700 border border-gray-600 text-white cursor-pointer hover:bg-gray-600'
                                  : manualSeatPlayerId
                                  ? 'bg-felt/20 border border-felt text-felt cursor-pointer hover:bg-felt/30'
                                  : 'bg-gray-800/50 border border-gray-800 text-gray-600'
                              }`}
                            >
                              <span className="font-mono text-[9px] text-gray-500">{seatNum}</span>
                              <span className="truncate max-w-[3rem] font-medium">
                                {entry?.player?.name?.split(' ')[0] || ''}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Bar */}
          <div className="border-t border-gray-800 bg-gray-900 p-3 sm:p-4 flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedLateBuyInPlayerId}
                onChange={(e) => setSelectedLateBuyInPlayerId(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-felt min-w-0 sm:min-w-[180px]"
              >
                <option value="">Late buy-in player...</option>
                {lateBuyInCandidates.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
              <button
                onClick={handleLateBuyIn}
                disabled={!selectedLateBuyInPlayerId}
                className="px-3 sm:px-4 py-2 bg-felt hover:bg-felt-dark disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-2 flex-shrink-0"
              >
                <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Buy-in Now</span><span className="sm:hidden">Buy-in</span>
              </button>
            </div>

            <div className="hidden sm:block h-8 w-px bg-gray-700" />
            <button
              onClick={() => setShowChipCount(true)}
              className="px-3 sm:px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium flex items-center gap-2 flex-shrink-0"
            >
              <Coins className="w-4 h-4" /> <span className="hidden sm:inline">Chip Count</span>
              <span className="sm:hidden">Chips</span>
            </button>

            <button
              onClick={handleAddTable}
              disabled={isAddingTable}
              className="px-3 sm:px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> {isAddingTable ? 'Adding...' : 'Add Table'}
            </button>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={manualSeatPlayerId}
                onChange={(e) => setManualSeatPlayerId(e.target.value)}
                className="flex-1 sm:flex-none px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-felt min-w-0 sm:min-w-[180px]"
              >
                <option value="">Manual seat buy-in...</option>
                {lateBuyInCandidates.map((p) => (
                  <option key={p.id} value={String(p.id)}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleMinimalBalance}
              disabled={isBalancing}
              className="px-3 sm:px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <ArrowRightLeft className="w-4 h-4" /> <span className="hidden sm:inline">{isBalancing ? 'Balancing...' : 'Balance (Minimal Moves)'}</span><span className="sm:hidden">{isBalancing ? 'Balancing...' : 'Balance'}</span>
            </button>
            <button
              onClick={() => { setShowRebuy(!showRebuy); setShowTopUp(false); setShowEliminate(false); }}
              className="px-3 sm:px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <DollarSign className="w-4 h-4" /> Rebuy
            </button>
            <button
              onClick={() => { setShowTopUp(!showTopUp); setShowRebuy(false); setShowEliminate(false); }}
              className="px-3 sm:px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Top-up
            </button>
            <button
              onClick={() => { setShowEliminate(!showEliminate); setShowRebuy(false); setShowTopUp(false); }}
              className="px-3 sm:px-4 py-2 bg-red-900/50 hover:bg-red-900/80 text-red-300 rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <UserX className="w-4 h-4" /> Eliminate
            </button>
            <div className="hidden sm:block flex-1" />
            {!isFinished && (
              <button
                onClick={handleFinish}
                className="w-full sm:w-auto px-4 sm:px-6 py-2 bg-gold hover:bg-gold-light text-gray-900 rounded-lg font-bold text-sm flex items-center justify-center gap-2"
              >
                <Trophy className="w-4 h-4" /> End Tournament
              </button>
            )}
          </div>
          {manualSeatPlayerId && (
            <div className="border-t border-gray-800 bg-gray-950 px-4 py-2">
              <p className="text-xs text-felt">
                Manual seat mode active. Click an empty seat to place this new buy-in.
              </p>
            </div>
          )}

          {/* Player Action Dropdown */}
          {(showRebuy || showTopUp || showEliminate) && (
            <div className="border-t border-gray-800 bg-gray-950 p-4">
              <p className="text-xs text-gray-400 mb-2">
                {showRebuy && `Select player to rebuy (${formatCurrencyShort(tournament.buyInAmount)}):`}
                {showTopUp && `Select player to top-up (${formatCurrencyShort(tournament.topUpAmount)}, +${tournament.topUpChips} chips):`}
                {showEliminate && 'Select player to eliminate:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {activePlayers.map((e) => {
                  const hasTopUp = playersWithTopUp.has(e.playerId);
                  const isDisabled = showTopUp && hasTopUp;
                  return (
                  <button
                    key={e.playerId}
                    disabled={isDisabled}
                    onClick={async () => {
                      if (showRebuy) { handleRebuyClick(e.playerId); return; }
                      else if (showTopUp) await recordTopUp(e.playerId);
                      else if (showEliminate) {
                        setShowEliminate(false);
                        setEliminateConfirm({ playerId: e.playerId, name: e.player?.name || `Player #${e.playerId}` });
                        return;
                      }
                      setShowRebuy(false);
                      setShowTopUp(false);
                      setShowEliminate(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isDisabled
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50'
                        : showEliminate
                        ? 'bg-red-900/30 hover:bg-red-900/60 text-red-300'
                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {e.player?.name}{isDisabled ? ' (done)' : ''}
                  </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Announcements (queued here, spoken by the TV display) */}
          <AnnouncePanel tournamentId={tournament.id} />

          {/* Quick Player Actions */}
          <div className="border-t border-gray-800 bg-gray-950 p-3 sm:p-4">
            <p className="text-xs text-gray-400 mb-2">Quick player actions</p>
            <div className="flex flex-wrap gap-2">
              {activePlayers.map((e) => (
                <div key={`quick-${e.playerId}`} className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-2 py-1.5">
                  <span className="text-xs text-white min-w-[80px] sm:min-w-[110px] max-w-[140px] truncate">{e.player?.name}</span>
                  <button
                    onClick={() => handleRebuyClick(e.playerId)}
                    className="px-2 py-1.5 sm:py-1 bg-gray-800 hover:bg-gray-700 text-white rounded text-xs"
                  >
                    Rebuy
                  </button>
                  <button
                    onClick={async () => {
                      await recordTopUp(e.playerId);
                    }}
                    disabled={playersWithTopUp.has(e.playerId)}
                    className={`px-2 py-1.5 sm:py-1 rounded text-xs ${
                      playersWithTopUp.has(e.playerId)
                        ? 'bg-gray-800 text-gray-600 cursor-not-allowed opacity-50'
                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                    }`}
                  >
                    <span className="hidden sm:inline">Top-up{playersWithTopUp.has(e.playerId) ? ' (done)' : ` (+${tournament.topUpChips})`}</span>
                    <span className="sm:hidden">Top-up{playersWithTopUp.has(e.playerId) ? '✓' : ''}</span>
                  </button>
                  <button
                    onClick={() => setEliminateConfirm({ playerId: e.playerId, name: e.player?.name || `Player #${e.playerId}` })}
                    className="px-2 py-1.5 sm:py-1 bg-red-900/40 hover:bg-red-900/70 text-red-300 rounded text-xs"
                  >
                    <span className="hidden sm:inline">Eliminate</span>
                    <span className="sm:hidden">Out</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Log */}
          <div className="border-t border-gray-800 bg-gray-900 p-3 sm:p-4 max-h-72 overflow-y-auto">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              Action Log <span className="text-gray-600 normal-case font-normal">— undo removes the entry and its money from the pot</span>
            </p>
            {(tournament.transactions || []).length === 0 ? (
              <p className="text-xs text-gray-500">No actions yet.</p>
            ) : (
              <div className="space-y-1">
                {[...(tournament.transactions || [])]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 30)
                  .map((tx) => {
                    const typeLabel: Record<string, string> = {
                      BUY_IN: 'Buy-in',
                      REBUY: 'Rebuy',
                      TOP_UP: 'Top-up',
                      PAYOUT: 'Payout',
                    };
                    const typeColor: Record<string, string> = {
                      BUY_IN: 'text-blue-400',
                      REBUY: 'text-purple-400',
                      TOP_UP: 'text-yellow-400',
                      PAYOUT: 'text-gold',
                    };
                    const time = new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    const canUndo = tx.type !== 'PAYOUT';
                    return (
                      <div key={tx.id} className="flex items-center gap-2 text-xs group">
                        <span className="text-gray-600 w-10 flex-shrink-0">{time}</span>
                        <span className={`w-14 flex-shrink-0 font-medium ${typeColor[tx.type] || 'text-gray-400'}`}>
                          {typeLabel[tx.type] || tx.type}
                        </span>
                        <span className="flex-1 text-gray-300 truncate">
                          {tx.player?.name || `#${tx.playerId}`}
                        </span>
                        <span className="text-gray-400 font-mono w-14 text-right flex-shrink-0">
                          {tx.type === 'PAYOUT' ? '-' : '+'}{formatCurrencyShort(tx.amount)}
                        </span>
                        {canUndo && (
                          <button
                            onClick={async () => {
                              if (confirm(`Undo ${typeLabel[tx.type]} for ${tx.player?.name}?`)) {
                                await undoTransaction(tx.id);
                              }
                            }}
                            className="px-2 py-1 bg-gray-800 hover:bg-red-900/60 text-gray-400 hover:text-red-300 rounded flex items-center gap-1 flex-shrink-0"
                            title={`Undo ${typeLabel[tx.type]}`}
                            aria-label={`Undo ${typeLabel[tx.type]}`}
                          >
                            <Undo2 className="w-3 h-3" />
                            <span className="hidden sm:inline text-[10px] font-medium">Undo</span>
                          </button>
                        )}
                        {!canUndo && <div className="w-5 sm:w-16 flex-shrink-0" />}
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Variable Rebuy Modal */}
          {showVariableRebuy && tournament && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full mx-4">
                <h2 className="text-lg font-bold text-white mb-4">Select Rebuy Amount</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  {(JSON.parse(tournament.buyInPresets || '[]') as number[]).map((amountCents) => (
                    <button
                      key={amountCents}
                      onClick={() => handleVariableRebuyConfirm(amountCents)}
                      className="px-4 py-2 bg-felt hover:bg-felt-dark text-white rounded-lg text-sm font-medium"
                    >
                      {formatCurrencyShort(amountCents)}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2 mb-4">
                  <input
                    type="number"
                    value={customRebuyAmount}
                    onChange={(e) => setCustomRebuyAmount(e.target.value)}
                    placeholder="Custom amount"
                    min="0"
                    step="0.01"
                    className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-felt"
                  />
                  <button
                    onClick={() => {
                      const cents = Math.round(parseFloat(customRebuyAmount || '0') * 100);
                      if (cents > 0) handleVariableRebuyConfirm(cents);
                    }}
                    disabled={!customRebuyAmount || parseFloat(customRebuyAmount) <= 0}
                    className="px-4 py-2 bg-felt hover:bg-felt-dark disabled:opacity-50 text-white rounded-lg text-sm font-medium"
                  >
                    Confirm
                  </button>
                </div>
                <button
                  onClick={() => { setShowVariableRebuy(false); setVariableRebuyPlayerId(null); }}
                  className="w-full px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Eliminate Confirmation Modal */}
          {eliminateConfirm && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-gray-900 border border-red-800/60 rounded-2xl p-6 sm:p-8 max-w-sm w-full mx-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center flex-shrink-0">
                    <UserX className="w-5 h-5 text-red-400" />
                  </div>
                  <h2 className="text-lg font-bold text-white">Eliminate Player?</h2>
                </div>
                <p className="text-sm text-gray-300 mb-2">
                  Do you really want to eliminate <span className="font-bold text-white">{eliminateConfirm.name}</span> from the game?
                </p>
                <p className="text-xs text-gray-500 mb-6">
                  They will not be able to rejoin this tournament.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setEliminateConfirm(null)}
                    disabled={isEliminating}
                    className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium text-sm disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      setIsEliminating(true);
                      try {
                        await eliminatePlayer(eliminateConfirm.playerId);
                        await checkBalance();
                        setEliminateConfirm(null);
                      } finally {
                        setIsEliminating(false);
                      }
                    }}
                    disabled={isEliminating}
                    className="flex-1 px-4 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <UserX className="w-4 h-4" />
                    {isEliminating ? 'Eliminating...' : 'Yes, Eliminate'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Chip Count — break-time stack survey, per table */}
          {showChipCount && (() => {
            const txs = tournament.transactions || [];
            const buyInTxCount = txs.filter((tx) => tx.type === 'BUY_IN' || tx.type === 'REBUY').length;
            const topUpTxCount = txs.filter((tx) => tx.type === 'TOP_UP').length;
            const expectedChips =
              buyInTxCount * tournament.startingChips + topUpTxCount * tournament.topUpChips;

            const chipsOf = (playerId: number) => parseInt(chipCounts[playerId] || '0') || 0;
            const countedTotal = activePlayers.reduce((sum, e) => sum + chipsOf(e.playerId), 0);
            const entered = activePlayers.filter((e) => (chipCounts[e.playerId] || '').trim() !== '');
            const average = activePlayers.length ? Math.round(countedTotal / activePlayers.length) : 0;
            const bigBlind = blindLevels[currentLevel - 1]?.bigBlind || 0;

            const tablesWithSeated = (tournament.tables || []).map((t) => {
              const seated = (t.entries || []).filter((e) => e.status === 'SEATED');
              return {
                table: t,
                seated: [...seated].sort((a, b) => (a.seatNumber || 0) - (b.seatNumber || 0)),
                chips: seated.reduce((sum, e) => sum + chipsOf(e.playerId), 0),
              };
            });

            const leaderboard = [...activePlayers].sort((a, b) => chipsOf(b.playerId) - chipsOf(a.playerId));

            return (
              <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-3 sm:p-4">
                <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 flex-none">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                      <Coins className="w-5 h-5 text-gold" /> Chip Count
                    </h2>
                    <button
                      onClick={() => setShowChipCount(false)}
                      className="p-2 text-gray-400 hover:text-white"
                      aria-label="Close"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Summary */}
                  <div className="px-5 py-3 border-b border-gray-800 flex-none grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Counted</p>
                      <p className="text-sm font-bold text-white">{countedTotal.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500">of {expectedChips.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Average</p>
                      <p className="text-sm font-bold text-gold">{average.toLocaleString()}</p>
                      <p className="text-[10px] text-gray-500">
                        {bigBlind ? `${Math.floor(average / bigBlind)} BB` : ' '}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-gray-500">Entered</p>
                      <p className="text-sm font-bold text-white">
                        {entered.length}/{activePlayers.length}
                      </p>
                      <p
                        className={`text-[10px] ${
                          countedTotal === expectedChips ? 'text-felt' : 'text-yellow-500'
                        }`}
                      >
                        {countedTotal === expectedChips
                          ? 'balanced'
                          : `${countedTotal > expectedChips ? '+' : ''}${(
                              countedTotal - expectedChips
                            ).toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  {/* Per-table entry */}
                  <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                    {tablesWithSeated.map(({ table, seated, chips }) => (
                      <div key={table.id}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-semibold text-white">
                            Table {table.tableNumber}
                            <span className="text-gray-500 font-normal"> &middot; {seated.length} players</span>
                          </h3>
                          <span className="text-xs text-gold font-mono">{chips.toLocaleString()}</span>
                        </div>
                        <div className="space-y-1.5">
                          {seated.map((e) => (
                            <div key={e.playerId} className="flex items-center gap-2">
                              <span className="text-[10px] font-mono text-gray-600 w-4 flex-none">
                                {e.seatNumber}
                              </span>
                              <span className="text-sm text-gray-200 flex-1 min-w-0 truncate">
                                {e.player?.name}
                              </span>
                              {bigBlind > 0 && chipsOf(e.playerId) > 0 && (
                                <span className="text-[10px] text-gray-500 flex-none">
                                  {Math.floor(chipsOf(e.playerId) / bigBlind)} BB
                                </span>
                              )}
                              <input
                                type="number"
                                inputMode="numeric"
                                value={chipCounts[e.playerId] || ''}
                                onChange={(ev) =>
                                  setChipCounts((prev) => ({ ...prev, [e.playerId]: ev.target.value }))
                                }
                                placeholder="0"
                                className="w-24 flex-none px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-white text-right focus:outline-none focus:border-felt"
                              />
                            </div>
                          ))}
                          {seated.length === 0 && (
                            <p className="text-xs text-gray-600">Nobody seated at this table.</p>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Leaderboard once something is entered */}
                    {entered.length > 0 && (
                      <div className="border-t border-gray-800 pt-3">
                        <h3 className="text-sm font-semibold text-white mb-2">Standings</h3>
                        <div className="space-y-1">
                          {leaderboard.map((e, i) => (
                            <div key={e.playerId} className="flex items-center gap-2 text-sm">
                              <span className="text-[10px] font-mono text-gray-600 w-4 flex-none">{i + 1}</span>
                              <span className="text-gray-200 flex-1 min-w-0 truncate">{e.player?.name}</span>
                              <span
                                className={`font-mono text-xs flex-none ${
                                  chipsOf(e.playerId) >= average ? 'text-felt' : 'text-gray-400'
                                }`}
                              >
                                {chipsOf(e.playerId).toLocaleString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rebalance preview */}
                  {balancePlan && (
                    <div className="flex-none border-t border-gray-800 px-5 py-3 bg-gray-950 max-h-64 overflow-y-auto">
                      <h3 className="text-sm font-semibold text-white mb-2">
                        Proposed moves{' '}
                        <span className="text-gray-500 font-normal">
                          ({balancePlan.moves.length})
                        </span>
                      </h3>

                      {balancePlan.moves.length === 0 ? (
                        <p className="text-xs text-felt">
                          Tables are already even. Nothing to move.
                        </p>
                      ) : (
                        <div className="space-y-1 mb-3">
                          {balancePlan.moves.map((m) => (
                            <div key={m.playerId} className="flex items-center gap-2 text-xs">
                              <ArrowRightLeft className="w-3 h-3 text-gold flex-none" />
                              <span className="text-white flex-1 min-w-0 truncate">{m.name}</span>
                              <span className="text-gray-400 font-mono flex-none">
                                {m.chips > 0 ? m.chips.toLocaleString() : '—'}
                              </span>
                              <span className="text-gray-500 flex-none">
                                T{m.fromTableNumber} s{m.fromSeat} &rarr;{' '}
                                <span className="text-gold">
                                  T{m.toTableNumber} s{m.toSeat}
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-1 border-t border-gray-800 pt-2">
                        {balancePlan.after.map((t) => (
                          <div key={t.tableNumber} className="flex items-center gap-2 text-xs">
                            <span className="text-gray-400 flex-1">Table {t.tableNumber}</span>
                            <span className="text-gray-600 font-mono">
                              {t.before.players}p / {t.before.chips.toLocaleString()}
                            </span>
                            <span className="text-gray-600">&rarr;</span>
                            <span className="text-white font-mono">
                              {t.after.players}p / {t.after.chips.toLocaleString()}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex-none px-5 py-3 border-t border-gray-800 flex flex-wrap gap-2">
                    <button
                      onClick={() => setChipCounts({})}
                      className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium flex-none"
                    >
                      Clear
                    </button>

                    {balancePlan ? (
                      <>
                        <button
                          onClick={() => setBalancePlan(null)}
                          className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-medium flex-none"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            await applyBalancePlan(balancePlan.moves);
                            setBalancePlan(null);
                          }}
                          disabled={isBalancing || balancePlan.moves.length === 0}
                          className="flex-1 px-4 py-2.5 bg-gold hover:bg-gold-light disabled:opacity-50 text-gray-900 rounded-lg text-sm font-bold"
                        >
                          {isBalancing ? 'Moving…' : `Apply ${balancePlan.moves.length} move(s)`}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setBalancePlan(buildBalancePlan())}
                          disabled={(tournament.tables?.length || 0) < 2}
                          className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <ArrowRightLeft className="w-4 h-4" /> Preview rebalance
                        </button>
                        <button
                          onClick={() => setShowChipCount(false)}
                          className="px-4 py-2.5 bg-felt hover:bg-felt-dark text-white rounded-lg text-sm font-medium flex-none"
                        >
                          Done
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Payout Modal - 2-step flow */}
          {showPayout && (() => {
            const txs = tournament.transactions || [];
            const buyInTxCount = txs.filter((tx) => tx.type === 'BUY_IN' || tx.type === 'REBUY').length;
            const topUpTxCount = txs.filter((tx) => tx.type === 'TOP_UP').length;
            const totalChips = buyInTxCount * tournament.startingChips + topUpTxCount * tournament.topUpChips;
            // Only chip-count the players still active — they hold all the chips
            const allPayoutPlayers = activePlayers;
            const chipSum = allPayoutPlayers.reduce((sum, e) => sum + (parseInt(chipCounts[e.playerId] || '0') || 0), 0);
            const chipsMatch = chipSum === totalChips;
            // Quick-split presets pay the chip leader the biggest share
            const rankedPayoutPlayers = [...allPayoutPlayers].sort(
              (a, b) => (parseInt(chipCounts[b.playerId] || '0') || 0) - (parseInt(chipCounts[a.playerId] || '0') || 0)
            );

            return (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 sm:p-8 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-gold" /> {payoutStep === 1 ? 'Step 1: Chip Count' : 'Step 2: Payouts'}
                </h2>
                <p className="text-sm text-gray-400 mb-2">
                  Main Pot: <span className="text-gold font-bold">{formatCurrencyShort(mainPot)}</span>
                </p>
                <p className="text-xs text-gray-500 mb-2">
                  Paid separately: {formatCurrencyShort(bountyPot)} bounties &middot;{' '}
                  {formatCurrencyShort(assPot)} ASS pot &middot; total in{' '}
                  {formatCurrencyShort(tournament.totalPrizePool)}
                </p>

                {payoutStep === 1 && (
                  <>
                    <p className="text-xs text-gray-500 mb-4">
                      Total chips in play: <span className="text-white font-semibold">{totalChips.toLocaleString()}</span>
                      {' '}({buyInTxCount} buy-ins x {tournament.startingChips.toLocaleString()} + {topUpTxCount} top-ups x {tournament.topUpChips.toLocaleString()})
                    </p>
                    <div className="space-y-2 mb-4">
                      {allPayoutPlayers.map((e) => (
                        <div key={e.playerId} className="flex items-center gap-3">
                          <span className="flex-1 min-w-0 text-sm text-white truncate">{e.player?.name}</span>
                          <input
                            type="number"
                            value={chipCounts[e.playerId] || ''}
                            onChange={(ev) => setChipCounts((prev) => ({ ...prev, [e.playerId]: ev.target.value }))}
                            className="w-24 sm:w-28 flex-shrink-0 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm text-right focus:outline-none focus:border-felt"
                            placeholder="0"
                          />
                        </div>
                      ))}
                    </div>
                    <div className={`text-sm mb-4 px-3 py-2 rounded-lg ${chipsMatch ? 'bg-green-900/20 text-green-400' : chipSum > 0 ? 'bg-yellow-900/20 text-yellow-300' : 'bg-gray-800 text-gray-500'}`}>
                      {chipsMatch
                        ? `✓ Chip counts match! (${chipSum.toLocaleString()} / ${totalChips.toLocaleString()})`
                        : chipSum > 0
                        ? `⚠ ${chipSum.toLocaleString()} entered vs ${totalChips.toLocaleString()} expected (off by ${Math.abs(chipSum - totalChips).toLocaleString()}) — payouts will be calculated on what you entered.`
                        : `Enter each player's chip count above.`}
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setShowPayout(false)} className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium text-sm">Cancel</button>
                      <button
                        disabled={chipSum === 0}
                        onClick={() => {
                          const totalChipsEntered = chipSum || 1;
                          const amounts: Record<number, string> = {};
                          for (const e of allPayoutPlayers) {
                            const chips = parseInt(chipCounts[e.playerId] || '0') || 0;
                            const dollarAmount = (chips / totalChipsEntered) * (mainPot / 100);
                            amounts[e.playerId] = dollarAmount > 0 ? dollarAmount.toFixed(2) : '';
                          }
                          setPayoutAmounts(amounts);
                          setPayoutStep(2);
                        }}
                        className="flex-1 px-4 py-2.5 bg-felt hover:bg-felt-dark disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm"
                      >
                        {chipsMatch ? 'Calculate Payouts →' : chipSum > 0 ? 'Calculate Anyway →' : 'Calculate Payouts →'}
                      </button>
                    </div>
                  </>
                )}

                {payoutStep === 2 && (
                  <>
                    {/* Quick presets based on player count */}
                    {allPayoutPlayers.length === 2 && (
                      <div className="flex gap-2 mb-4 flex-wrap">
                        <p className="text-xs text-gray-500 w-full mb-1">Quick splits:</p>
                        {[
                          { label: '65/35', splits: [65, 35] },
                          { label: '60/40', splits: [60, 40] },
                          { label: '70/30', splits: [70, 30] },
                          { label: '55/45', splits: [55, 45] },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => {
                              const amounts: Record<number, string> = {};
                              preset.splits.forEach((pct, i) => {
                                if (rankedPayoutPlayers[i]) {
                                  amounts[rankedPayoutPlayers[i].playerId] = ((mainPot * pct) / 100 / 100).toFixed(2);
                                }
                              });
                              setPayoutAmounts(amounts);
                            }}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-medium"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    )}
                    {allPayoutPlayers.length === 3 && (
                      <div className="flex gap-2 mb-4 flex-wrap">
                        <p className="text-xs text-gray-500 w-full mb-1">Quick splits:</p>
                        {[
                          { label: '50/30/20', splits: [50, 30, 20] },
                          { label: '45/35/20', splits: [45, 35, 20] },
                          { label: '40/35/25', splits: [40, 35, 25] },
                        ].map((preset) => (
                          <button
                            key={preset.label}
                            onClick={() => {
                              const amounts: Record<number, string> = {};
                              preset.splits.forEach((pct, i) => {
                                if (rankedPayoutPlayers[i]) {
                                  amounts[rankedPayoutPlayers[i].playerId] = ((mainPot * pct) / 100 / 100).toFixed(2);
                                }
                              });
                              setPayoutAmounts(amounts);
                            }}
                            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs font-medium"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="space-y-2 mb-4">
                      {allPayoutPlayers.map((e) => {
                        const chips = parseInt(chipCounts[e.playerId] || '0') || 0;
                        const pct = chipSum > 0 ? ((chips / chipSum) * 100).toFixed(1) : '0.0';
                        return (
                        <div key={e.playerId} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <div className="flex-1 min-w-0 flex items-baseline gap-2">
                            <span className="text-sm font-medium text-white truncate">{e.player?.name}</span>
                            <span className="text-xs text-gray-500 flex-shrink-0">{chips.toLocaleString()} chips ({pct}%)</span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <span className="text-xs text-gray-500">$</span>
                            <input
                              type="number"
                              value={payoutAmounts[e.playerId] || ''}
                              onChange={(ev) => setPayoutAmounts((prev) => ({ ...prev, [e.playerId]: ev.target.value }))}
                              className="flex-1 sm:flex-none w-full sm:w-24 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-white text-sm text-right focus:outline-none focus:border-felt"
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        );
                      })}
                    </div>

                    {/* Total allocated vs prize pool */}
                    {(() => {
                      const totalAllocated = Object.values(payoutAmounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
                      const prizeTotal = mainPot / 100;
                      const diff = Math.abs(totalAllocated - prizeTotal);
                      const ok = diff < 0.02;
                      return (
                        <p className={`text-xs mb-4 ${ok ? 'text-green-400' : 'text-yellow-400'}`}>
                          Allocated: ${totalAllocated.toFixed(2)} / ${prizeTotal.toFixed(2)} prize pool
                          {ok ? ' ✓' : ` (${diff.toFixed(2)} remaining)`}
                        </p>
                      );
                    })()}

                    <div className="flex gap-3">
                      <button onClick={() => setPayoutStep(1)} className="flex-1 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium text-sm">← Back</button>
                      <button onClick={handleConfirmPayouts} className="flex-1 px-4 py-2.5 bg-gold hover:bg-gold-light text-gray-900 rounded-lg font-bold text-sm">Confirm &amp; End Tournament</button>
                    </div>
                  </>
                )}
              </div>
            </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
