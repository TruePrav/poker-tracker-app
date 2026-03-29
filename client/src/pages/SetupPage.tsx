import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Settings, Users, LayoutGrid, ChevronRight, ChevronLeft, Shuffle, Plus, Trash2, X, Check, Edit2, Save, Coffee } from 'lucide-react';
import { useTournamentStore } from '../stores/useTournamentStore';
import { usePlayerStore } from '../stores/usePlayerStore';
import { fetchBlindStructures, createBlindStructure, updateBlindLevels, updateBlindStructureName } from '../api/blinds';
import { formatCurrencyShort } from '../utils/formatCurrency';
import type { BlindStructure, BlindLevel } from 'shared';
import { MAX_SEATS_PER_TABLE } from 'shared';

const steps = [
  { label: 'Settings', icon: Settings },
  { label: 'Players', icon: Users },
  { label: 'Seating', icon: LayoutGrid },
];

interface EditableLevel {
  smallBlind: string;
  bigBlind: string;
  ante: string;
  durationMinutes: string;
  isBreak: boolean;
}

const emptyLevel: EditableLevel = { smallBlind: '', bigBlind: '', ante: '0', durationMinutes: '15', isBreak: false };

export function SetupPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const tournament = useTournamentStore((s) => s.tournament);
  const loadTournament = useTournamentStore((s) => s.loadTournament);
  const createTournament = useTournamentStore((s) => s.createTournament);
  const updateSettings = useTournamentStore((s) => s.updateSettings);
  const updateStatus = useTournamentStore((s) => s.updateStatus);
  const addEntry = useTournamentStore((s) => s.addEntry);
  const removeEntry = useTournamentStore((s) => s.removeEntry);
  const shuffleSeats = useTournamentStore((s) => s.shuffleSeats);
  const createTable = useTournamentStore((s) => s.createTable);
  const { players, fetchPlayers, addPlayer: addNewPlayer } = usePlayerStore();

  const [blindStructures, setBlindStructures] = useState<BlindStructure[]>([]);

  // Form state for step 1
  const [name, setName] = useState('');
  const [buyIn, setBuyIn] = useState('20');
  const [topUp, setTopUp] = useState('10');
  const [startingChips, setStartingChips] = useState('10000');
  const [selectedStructureId, setSelectedStructureId] = useState<number | null>(null);

  // Custom blind structure editor
  const [showEditor, setShowEditor] = useState(false);
  const [editingStructureId, setEditingStructureId] = useState<number | null>(null);
  const [editorName, setEditorName] = useState('');
  const [editorLevels, setEditorLevels] = useState<EditableLevel[]>([{ ...emptyLevel }]);
  const [savingStructure, setSavingStructure] = useState(false);

  // Step 2
  // Variable buy-in
  const [buyInType, setBuyInType] = useState<'FIXED' | 'VARIABLE'>('FIXED');
  const [buyInPresetBoxes, setBuyInPresetBoxes] = useState<string[]>(['', '', '', '']);

  const [newPlayerName, setNewPlayerName] = useState('');
  const [isStarting, setIsStarting] = useState(false);

  const loadStructures = async () => {
    const s = await fetchBlindStructures();
    setBlindStructures(s);
    return s;
  };

  useEffect(() => {
    fetchPlayers();
    loadStructures().then((s) => {
      const def = s.find((x) => x.isDefault);
      if (def) setSelectedStructureId(def.id);
    });
    if (id) {
      loadTournament(Number(id));
    }
  }, [id]);

  useEffect(() => {
    if (tournament && id) {
      setName(tournament.name);
      setBuyIn(String(tournament.buyInAmount / 100));
      setTopUp(String(tournament.topUpAmount / 100));
      setStartingChips(String(tournament.startingChips));
      setSelectedStructureId(tournament.blindStructureId);
      setBuyInType((tournament.buyInType as 'FIXED' | 'VARIABLE') || 'FIXED');
      const presets: number[] = JSON.parse(tournament.buyInPresets || '[]');
      const boxes = ['', '', '', ''];
      presets.slice(0, 4).forEach((c, i) => { boxes[i] = (c / 100).toString(); });
      setBuyInPresetBoxes(boxes);
    }
  }, [tournament, id]);

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const handleCreateOrUpdate = async () => {
    const presetsInCents = buyInType === 'VARIABLE'
      ? JSON.stringify(buyInPresetBoxes.map((s) => Math.round(parseFloat(s || '0') * 100)).filter((n) => n > 0))
      : '[]';
    const data = {
      name: name || `Game - ${today}`,
      buyInAmount: Math.round(parseFloat(buyIn || '0') * 100),
      topUpAmount: Math.round(parseFloat(topUp || '0') * 100),
      startingChips: parseInt(startingChips) || 10000,
      blindStructureId: selectedStructureId || undefined,
      buyInType,
      buyInPresets: presetsInCents,
    };

    if (tournament && id) {
      await updateSettings(data);
    } else {
      await createTournament(data);
    }
    setStep(1);
  };

  const registeredPlayerIds = new Set(tournament?.entries?.map((e) => e.playerId) || []);

  const togglePlayer = async (playerId: number) => {
    if (!tournament) return;
    if (registeredPlayerIds.has(playerId)) {
      await removeEntry(playerId);
    } else {
      await addEntry(playerId);
    }
  };

  const handleAddNewPlayer = async () => {
    if (!newPlayerName.trim()) return;
    const player = await addNewPlayer(newPlayerName.trim());
    setNewPlayerName('');
    if (tournament) {
      await addEntry(player.id);
    }
  };

  const handleStartTournament = async () => {
    if (!tournament) return;
    if (isStarting) return;
    setIsStarting(true);
    try {
    const entryCount = tournament.entries?.filter((e) => e.status === 'REGISTERED' || e.status === 'SEATED').length || 0;
    if (!tournament.tables || tournament.tables.length === 0) {
      const numTables = Math.max(1, Math.ceil(entryCount / MAX_SEATS_PER_TABLE));
      for (let i = 1; i <= numTables; i++) {
        await createTable(i, `Table ${i}`);
      }
    }
    const seatedCount = tournament.entries?.filter((e) => e.status === 'SEATED').length || 0;
    if (seatedCount === 0 && entryCount > 0) {
      await shuffleSeats();
    }
    const store = useTournamentStore.getState();
    const txPlayerIds = new Set(store.tournament?.transactions?.map((t) => t.playerId) || []);
    for (const entry of store.tournament?.entries || []) {
      if (!txPlayerIds.has(entry.playerId)) {
        await store.recordBuyIn(entry.playerId);
      }
    }
    await updateStatus('RUNNING');
    navigate(`/tournament/${tournament.id}`);
    } finally {
      setIsStarting(false);
    }
  };

  // --- Custom Blind Structure Editor ---
  const openNewStructure = () => {
    setEditingStructureId(null);
    setEditorName('');
    setEditorLevels([
      { smallBlind: '25', bigBlind: '50', ante: '0', durationMinutes: '15', isBreak: false },
      { smallBlind: '50', bigBlind: '100', ante: '0', durationMinutes: '15', isBreak: false },
      { smallBlind: '100', bigBlind: '200', ante: '0', durationMinutes: '15', isBreak: false },
    ]);
    setShowEditor(true);
  };

  const openEditStructure = (structure: BlindStructure) => {
    setEditingStructureId(structure.id);
    setEditorName(structure.name);
    setEditorLevels(
      (structure.levels || []).map((l) => ({
        smallBlind: String(l.smallBlind),
        bigBlind: String(l.bigBlind),
        ante: String(l.ante),
        durationMinutes: String(l.durationMinutes),
        isBreak: l.isBreak,
      }))
    );
    setShowEditor(true);
  };

  const addEditorLevel = (isBreak: boolean) => {
    const last = editorLevels[editorLevels.length - 1];
    if (isBreak) {
      setEditorLevels([...editorLevels, { smallBlind: '0', bigBlind: '0', ante: '0', durationMinutes: '10', isBreak: true }]);
    } else {
      setEditorLevels([
        ...editorLevels,
        {
          smallBlind: last ? String(parseInt(last.bigBlind || '0')) : '',
          bigBlind: last ? String(parseInt(last.bigBlind || '0') * 2) : '',
          ante: '0',
          durationMinutes: last?.durationMinutes || '15',
          isBreak: false,
        },
      ]);
    }
  };

  const updateEditorLevel = (index: number, field: keyof EditableLevel, value: string | boolean) => {
    setEditorLevels((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  };

  const removeEditorLevel = (index: number) => {
    setEditorLevels((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveStructure = async () => {
    if (!editorName.trim() || editorLevels.length === 0) return;
    setSavingStructure(true);
    try {
      const levels = editorLevels.map((l) => ({
        smallBlind: parseInt(l.smallBlind) || 0,
        bigBlind: parseInt(l.bigBlind) || 0,
        ante: parseInt(l.ante) || 0,
        durationMinutes: parseInt(l.durationMinutes) || 15,
        isBreak: l.isBreak,
      }));

      if (editingStructureId) {
        await updateBlindStructureName(editingStructureId, editorName.trim());
        await updateBlindLevels(editingStructureId, levels);
      } else {
        const created = await createBlindStructure(editorName.trim(), levels);
        setSelectedStructureId(created.id);
      }

      const updated = await loadStructures();
      setShowEditor(false);
    } finally {
      setSavingStructure(false);
    }
  };

  const activeEntries = tournament?.entries?.filter(
    (e) => e.status === 'REGISTERED' || e.status === 'SEATED'
  ) || [];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">
        {id ? 'Edit Tournament' : 'New Tournament'}
      </h1>

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={i} className="flex items-center gap-2">
            <button
              onClick={() => (tournament || i === 0) && setStep(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                step === i
                  ? 'bg-felt text-white'
                  : i < step
                  ? 'bg-gray-800 text-felt cursor-pointer'
                  : 'bg-gray-900 text-gray-500'
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
            {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-600" />}
          </div>
        ))}
      </div>

      {/* Step 1: Settings */}
      {step === 0 && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tournament Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`Game - ${today}`}
                className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-felt"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Buy-in (BBD $)</label>
                <input
                  type="number"
                  value={buyIn}
                  onChange={(e) => setBuyIn(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-felt"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Top-up (BBD $)</label>
                <input
                  type="number"
                  value={topUp}
                  onChange={(e) => setTopUp(e.target.value)}
                  min="0"
                  step="0.01"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-felt"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Starting Chips</label>
                <input
                  type="number"
                  value={startingChips}
                  onChange={(e) => setStartingChips(e.target.value)}
                  min="1000"
                  step="1000"
                  className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-felt"
                />
              </div>
            </div>

            {/* Variable Buy-in Toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Buy-in Type</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="buyInType"
                    checked={buyInType === 'FIXED'}
                    onChange={() => setBuyInType('FIXED')}
                    className="accent-felt"
                  />
                  <span className="text-sm text-gray-300">Consistent buy-ins</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="buyInType"
                    checked={buyInType === 'VARIABLE'}
                    onChange={() => setBuyInType('VARIABLE')}
                    className="accent-felt"
                  />
                  <span className="text-sm text-gray-300">Variable buy-ins</span>
                </label>
              </div>
              {buyInType === 'VARIABLE' && (
                <div className="mt-3">
                  <label className="block text-xs text-gray-400 mb-2">Preset buy-in amounts — up to 4 options (BBD $)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {buyInPresetBoxes.map((val, i) => (
                      <div key={i}>
                        <label className="block text-[11px] text-gray-600 mb-1 text-center">Option {i + 1}</label>
                        <input
                          type="number"
                          value={val}
                          onChange={(e) => {
                            const next = [...buyInPresetBoxes];
                            next[i] = e.target.value;
                            setBuyInPresetBoxes(next);
                          }}
                          min="0"
                          step="1"
                          placeholder="—"
                          className="w-full px-3 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-center placeholder-gray-600 focus:outline-none focus:border-felt"
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[11px] text-gray-600 mt-1">Leave blank to skip. During the game, a popup will let you pick which amount or enter custom.</p>
                </div>
              )}
            </div>
          </div>

          {/* Blind Structure Selection */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300">Blind Structure</h3>
              <button
                onClick={openNewStructure}
                className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Create Custom
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {blindStructures.map((s) => (
                <div key={s.id} className="relative">
                  <button
                    onClick={() => setSelectedStructureId(s.id)}
                    className={`w-full p-3 rounded-lg border text-sm text-left transition-colors ${
                      selectedStructureId === s.id
                        ? 'border-felt bg-felt/10 text-white'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                    }`}
                  >
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs mt-1 text-gray-500">{s.levels?.length || 0} levels</p>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditStructure(s);
                    }}
                    className="absolute top-2 right-2 p-1 text-gray-600 hover:text-gray-300 transition-colors"
                    title="Edit structure"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Show selected structure levels */}
            {selectedStructureId && !showEditor && (
              <div className="mt-4">
                <h4 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">Levels</h4>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {blindStructures
                    .find((s) => s.id === selectedStructureId)
                    ?.levels?.map((l) => (
                      <div
                        key={l.id}
                        className={`flex items-center justify-between px-3 py-1.5 rounded text-xs ${
                          l.isBreak ? 'bg-yellow-900/20 text-yellow-400' : 'bg-gray-800 text-gray-300'
                        }`}
                      >
                        <span>Lvl {l.level}</span>
                        <span>
                          {l.isBreak
                            ? 'BREAK'
                            : `${l.smallBlind}/${l.bigBlind}${l.ante ? ` (ante ${l.ante})` : ''}`}
                        </span>
                        <span>{l.durationMinutes}m</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Custom Blind Structure Editor Modal */}
            {showEditor && (
              <div className="mt-4 bg-gray-800 border border-gray-700 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-semibold text-white">
                    {editingStructureId ? 'Edit Structure' : 'New Custom Structure'}
                  </h4>
                  <button onClick={() => setShowEditor(false)} className="text-gray-500 hover:text-gray-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="mb-4">
                  <label className="block text-xs font-medium text-gray-400 mb-1">Structure Name</label>
                  <input
                    type="text"
                    value={editorName}
                    onChange={(e) => setEditorName(e.target.value)}
                    placeholder="e.g. Friday Night Special"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white placeholder-gray-500 text-sm focus:outline-none focus:border-felt"
                  />
                </div>

                {/* Levels Table */}
                <div className="mb-3">
                  <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_32px] gap-2 mb-2 text-xs text-gray-500 font-medium px-1">
                    <span>#</span>
                    <span>Small</span>
                    <span>Big</span>
                    <span>Ante</span>
                    <span>Mins</span>
                    <span></span>
                  </div>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {editorLevels.map((level, i) => (
                      <div key={i} className={`grid grid-cols-[40px_1fr_1fr_1fr_1fr_32px] gap-2 items-center ${level.isBreak ? 'bg-yellow-900/10 rounded-lg p-1' : ''}`}>
                        <span className="text-xs text-gray-500 text-center">{i + 1}</span>
                        {level.isBreak ? (
                          <>
                            <div className="col-span-3 text-center">
                              <span className="text-xs text-yellow-500 font-medium flex items-center justify-center gap-1">
                                <Coffee className="w-3 h-3" /> BREAK
                              </span>
                            </div>
                            <input
                              type="number"
                              value={level.durationMinutes}
                              onChange={(e) => updateEditorLevel(i, 'durationMinutes', e.target.value)}
                              className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-white text-xs text-center focus:outline-none focus:border-felt"
                              min="1"
                            />
                          </>
                        ) : (
                          <>
                            <input
                              type="number"
                              value={level.smallBlind}
                              onChange={(e) => updateEditorLevel(i, 'smallBlind', e.target.value)}
                              className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-white text-xs text-center focus:outline-none focus:border-felt"
                              placeholder="25"
                              min="0"
                            />
                            <input
                              type="number"
                              value={level.bigBlind}
                              onChange={(e) => updateEditorLevel(i, 'bigBlind', e.target.value)}
                              className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-white text-xs text-center focus:outline-none focus:border-felt"
                              placeholder="50"
                              min="0"
                            />
                            <input
                              type="number"
                              value={level.ante}
                              onChange={(e) => updateEditorLevel(i, 'ante', e.target.value)}
                              className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-white text-xs text-center focus:outline-none focus:border-felt"
                              placeholder="0"
                              min="0"
                            />
                            <input
                              type="number"
                              value={level.durationMinutes}
                              onChange={(e) => updateEditorLevel(i, 'durationMinutes', e.target.value)}
                              className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-white text-xs text-center focus:outline-none focus:border-felt"
                              placeholder="15"
                              min="1"
                            />
                          </>
                        )}
                        <button
                          onClick={() => removeEditorLevel(i)}
                          className="p-1 text-gray-600 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Add Level / Break buttons */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => addEditorLevel(false)}
                    className="px-3 py-1.5 bg-gray-900 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Add Level
                  </button>
                  <button
                    onClick={() => addEditorLevel(true)}
                    className="px-3 py-1.5 bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 rounded-lg text-xs font-medium flex items-center gap-1"
                  >
                    <Coffee className="w-3 h-3" /> Add Break
                  </button>
                </div>

                {/* Save */}
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setShowEditor(false)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveStructure}
                    disabled={!editorName.trim() || editorLevels.length === 0 || savingStructure}
                    className="px-4 py-2 bg-felt hover:bg-felt-dark disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-1"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {savingStructure ? 'Saving...' : 'Save Structure'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleCreateOrUpdate}
              className="px-6 py-2.5 bg-felt hover:bg-felt-dark text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Players */}
      {step === 1 && tournament && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">
                Select Players ({registeredPlayerIds.size} selected)
              </h3>
            </div>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddNewPlayer()}
                placeholder="Add new player..."
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-felt text-sm"
              />
              <button
                onClick={handleAddNewPlayer}
                disabled={!newPlayerName.trim()}
                className="px-4 py-2 bg-felt hover:bg-felt-dark disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </div>

            <div className="space-y-1 max-h-96 overflow-y-auto">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => togglePlayer(p.id)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm transition-colors ${
                    registeredPlayerIds.has(p.id)
                      ? 'bg-felt/15 border border-felt/30 text-white'
                      : 'bg-gray-800 border border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>{p.name}</span>
                  {registeredPlayerIds.has(p.id) ? (
                    <Check className="w-4 h-4 text-felt" />
                  ) : (
                    <Plus className="w-4 h-4 text-gray-600" />
                  )}
                </button>
              ))}
              {players.length === 0 && (
                <p className="text-center text-gray-500 py-8">No players yet. Add one above.</p>
              )}
            </div>
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(0)}
              className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={registeredPlayerIds.size === 0}
              className="px-6 py-2.5 bg-felt hover:bg-felt-dark disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Seating */}
      {step === 2 && tournament && (
        <div className="space-y-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-300">Table Assignment</h3>
              <button
                onClick={shuffleSeats}
                className="px-4 py-2 bg-felt hover:bg-felt-dark text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                <Shuffle className="w-4 h-4" /> Shuffle All
              </button>
            </div>

            <p className="text-xs text-gray-400 mb-4">
              {activeEntries.length} players across{' '}
              {Math.max(1, Math.ceil(activeEntries.length / MAX_SEATS_PER_TABLE))} table(s).
              Click &quot;Shuffle All&quot; to randomly assign seats, or start the game and arrange manually.
            </p>

            {tournament.tables && tournament.tables.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {tournament.tables.map((table) => (
                  <div key={table.id} className="bg-gray-800 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-white mb-3">
                      Table {table.tableNumber}
                      <span className="text-gray-500 font-normal ml-2">
                        ({table.entries?.filter((e) => e.status === 'SEATED').length || 0}/{MAX_SEATS_PER_TABLE})
                      </span>
                    </h4>
                    <div className="space-y-1">
                      {Array.from({ length: MAX_SEATS_PER_TABLE }, (_, i) => i + 1).map((seatNum) => {
                        const entry = table.entries?.find((e) => e.seatNumber === seatNum && e.status === 'SEATED');
                        return (
                          <div
                            key={seatNum}
                            className={`flex items-center gap-3 px-3 py-1.5 rounded text-xs ${
                              entry ? 'bg-gray-700 text-white' : 'bg-gray-900/50 text-gray-600'
                            }`}
                          >
                            <span className="w-5 text-center font-mono">{seatNum}</span>
                            <span>{entry ? entry.player?.name : '---'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Tables will be auto-created when you shuffle or start the game.</p>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button
              onClick={handleStartTournament}
              disabled={activeEntries.length === 0 || isStarting}
              className="px-8 py-3 bg-gold hover:bg-gold-light disabled:opacity-50 text-gray-900 rounded-lg font-bold text-lg transition-colors"
            >
              {isStarting ? 'Starting...' : 'Start Tournament!'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
