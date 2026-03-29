import { useEffect, useMemo, useState } from 'react';
import { Coffee, Edit2, Plus, Save, Trash2, X } from 'lucide-react';
import type { BlindStructure } from 'shared';
import {
  fetchBlindStructures,
  createBlindStructure,
  updateBlindLevels,
  updateBlindStructureName,
  deleteBlindStructure,
} from '../api/blinds';

interface EditableLevel {
  smallBlind: string;
  bigBlind: string;
  ante: string;
  durationMinutes: string;
  isBreak: boolean;
}

const emptyLevel: EditableLevel = {
  smallBlind: '',
  bigBlind: '',
  ante: '0',
  durationMinutes: '15',
  isBreak: false,
};

export function BlindStructuresPage() {
  const [structures, setStructures] = useState<BlindStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [levels, setLevels] = useState<EditableLevel[]>([{ ...emptyLevel }]);

  async function loadAll() {
    setLoading(true);
    try {
      const data = await fetchBlindStructures();
      setStructures(data);
      if (!selectedId && data.length) {
        setSelectedId(data[0].id);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const selected = useMemo(
    () => structures.find((s) => s.id === selectedId) || null,
    [structures, selectedId]
  );

  useEffect(() => {
    if (!selected) return;
    setEditingId(selected.id);
    setName(selected.name);
    setLevels(
      (selected.levels || []).map((l) => ({
        smallBlind: String(l.smallBlind),
        bigBlind: String(l.bigBlind),
        ante: String(l.ante),
        durationMinutes: String(l.durationMinutes),
        isBreak: l.isBreak,
      }))
    );
  }, [selected?.id]);

  function startNew() {
    setSelectedId(null);
    setEditingId(null);
    setName('');
    setLevels([
      { smallBlind: '25', bigBlind: '50', ante: '0', durationMinutes: '15', isBreak: false },
      { smallBlind: '50', bigBlind: '100', ante: '0', durationMinutes: '15', isBreak: false },
      { smallBlind: '100', bigBlind: '200', ante: '0', durationMinutes: '15', isBreak: false },
    ]);
  }

  function addLevel(isBreak: boolean) {
    if (isBreak) {
      setLevels([...levels, { smallBlind: '0', bigBlind: '0', ante: '0', durationMinutes: '10', isBreak: true }]);
      return;
    }
    const last = levels[levels.length - 1];
    const nextSmall = String(parseInt(last?.bigBlind || '0') || 100);
    const nextBig = String((parseInt(nextSmall) || 100) * 2);
    setLevels([...levels, { smallBlind: nextSmall, bigBlind: nextBig, ante: '0', durationMinutes: last?.durationMinutes || '15', isBreak: false }]);
  }

  function updateLevel(index: number, field: keyof EditableLevel, value: string | boolean) {
    setLevels((prev) => prev.map((l, i) => (i === index ? { ...l, [field]: value } : l)));
  }

  function removeLevel(index: number) {
    setLevels((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveStructure() {
    if (!name.trim() || levels.length === 0) return;
    setSaving(true);
    try {
      const payload = levels.map((l) => ({
        smallBlind: parseInt(l.smallBlind) || 0,
        bigBlind: parseInt(l.bigBlind) || 0,
        ante: parseInt(l.ante) || 0,
        durationMinutes: parseInt(l.durationMinutes) || 15,
        isBreak: l.isBreak,
      }));

      if (editingId) {
        await updateBlindStructureName(editingId, name.trim());
        await updateBlindLevels(editingId, payload);
        setSelectedId(editingId);
      } else {
        const created = await createBlindStructure(name.trim(), payload);
        setSelectedId(created.id);
      }
      await loadAll();
    } finally {
      setSaving(false);
    }
  }

  async function removeSelected() {
    if (!selected) return;
    const ok = window.confirm(`Delete blind structure "${selected.name}"?`);
    if (!ok) return;
    await deleteBlindStructure(selected.id);
    setSelectedId(null);
    await loadAll();
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Blind Structures</h1>
        <button
          onClick={startNew}
          className="px-4 py-2 bg-felt hover:bg-felt-dark text-white rounded-lg text-sm font-medium flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New Structure
        </button>
      </div>

      <div className="grid grid-cols-[280px_1fr] gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 max-h-[75vh] overflow-y-auto">
          {loading ? (
            <p className="text-sm text-gray-500 p-3">Loading...</p>
          ) : (
            <div className="space-y-2">
              {structures.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                    selectedId === s.id
                      ? 'border-felt bg-felt/10 text-white'
                      : 'border-gray-700 bg-gray-800 text-gray-300 hover:border-gray-600'
                  }`}
                >
                  <p className="text-sm font-semibold">{s.name}</p>
                  <p className="text-xs text-gray-500">{s.levels?.length || 0} levels</p>
                </button>
              ))}
              {structures.length === 0 && <p className="text-sm text-gray-500 p-3">No structures yet.</p>}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
              <Edit2 className="w-4 h-4" /> {editingId ? 'Edit Structure' : 'New Structure'}
            </h2>
            {editingId && (
              <button
                onClick={removeSelected}
                className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/70 text-red-300 rounded-lg text-xs font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>

          <div className="mb-4">
            <label className="block text-xs font-medium text-gray-400 mb-1">Structure Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Friday Turbo"
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:outline-none focus:border-felt"
            />
          </div>

          <div className="grid grid-cols-[40px_1fr_1fr_1fr_1fr_32px] gap-2 mb-2 text-xs text-gray-500 font-medium px-1">
            <span>#</span>
            <span>Small</span>
            <span>Big</span>
            <span>Ante</span>
            <span>Mins</span>
            <span />
          </div>
          <div className="space-y-1.5 max-h-[46vh] overflow-y-auto mb-4">
            {levels.map((level, i) => (
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
                      onChange={(e) => updateLevel(i, 'durationMinutes', e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-900 border border-gray-600 rounded text-white text-xs text-center focus:outline-none focus:border-felt"
                      min="1"
                    />
                  </>
                ) : (
                  <>
                    <input
                      type="number"
                      value={level.smallBlind}
                      onChange={(e) => updateLevel(i, 'smallBlind', e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs text-center focus:outline-none focus:border-felt"
                      min="0"
                    />
                    <input
                      type="number"
                      value={level.bigBlind}
                      onChange={(e) => updateLevel(i, 'bigBlind', e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs text-center focus:outline-none focus:border-felt"
                      min="0"
                    />
                    <input
                      type="number"
                      value={level.ante}
                      onChange={(e) => updateLevel(i, 'ante', e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs text-center focus:outline-none focus:border-felt"
                      min="0"
                    />
                    <input
                      type="number"
                      value={level.durationMinutes}
                      onChange={(e) => updateLevel(i, 'durationMinutes', e.target.value)}
                      className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-white text-xs text-center focus:outline-none focus:border-felt"
                      min="1"
                    />
                  </>
                )}
                <button onClick={() => removeLevel(i)} className="p-1 text-gray-600 hover:text-red-400 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => addLevel(false)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-medium flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Add Level
            </button>
            <button
              onClick={() => addLevel(true)}
              className="px-3 py-1.5 bg-yellow-900/30 hover:bg-yellow-900/50 text-yellow-400 rounded-lg text-xs font-medium flex items-center gap-1"
            >
              <Coffee className="w-3 h-3" /> Add Break
            </button>
          </div>

          <button
            onClick={saveStructure}
            disabled={!name.trim() || levels.length === 0 || saving}
            className="px-4 py-2 bg-felt hover:bg-felt-dark disabled:opacity-60 text-white rounded-lg text-sm font-semibold flex items-center gap-2"
          >
            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Structure'}
          </button>
        </div>
      </div>
    </div>
  );
}
