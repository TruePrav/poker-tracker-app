import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Trash2, RefreshCw } from 'lucide-react';
import type { Tournament } from 'shared';
import { fetchTournaments, deleteTournament, deleteActiveTournaments } from '../api/tournaments';
import { formatCurrencyShort } from '../utils/formatCurrency';

const ACTIVE_STATUSES = new Set(['SETUP', 'RUNNING', 'PAUSED']);

export function DatabaseAdminPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const activeTournaments = useMemo(
    () => tournaments.filter((t) => ACTIVE_STATUSES.has(t.status)),
    [tournaments]
  );

  async function load() {
    setLoading(true);
    try {
      const data = await fetchTournaments();
      setTournaments(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDeleteOne(t: Tournament) {
    const ok = window.confirm(
      `Delete tournament "${t.name}" (id ${t.id})?\nThis permanently removes entries, tables, and transactions for it.`
    );
    if (!ok) return;
    setBusy(true);
    setMessage('');
    try {
      await deleteTournament(t.id);
      setMessage(`Deleted tournament "${t.name}".`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteAllActive() {
    if (activeTournaments.length === 0) return;
    const ok = window.confirm(
      `Delete ALL active tournaments (${activeTournaments.length})?\nThis cannot be undone.`
    );
    if (!ok) return;
    setBusy(true);
    setMessage('');
    try {
      const result = await deleteActiveTournaments();
      setMessage(`Deleted ${result.deletedCount} active tournament(s).`);
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Database Admin</h1>
          <p className="text-xs sm:text-sm text-gray-400">View and clean active tournaments</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading || busy}
            className="flex-1 sm:flex-none px-3 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-60 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button
            onClick={handleDeleteAllActive}
            disabled={busy || activeTournaments.length === 0}
            className="flex-1 sm:flex-none px-3 py-2 bg-red-900/50 hover:bg-red-900/80 disabled:opacity-60 text-red-200 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete All Active</span><span className="sm:hidden">Delete All</span>
          </button>
        </div>
      </div>

      <div className="mb-4 p-3 rounded-lg border border-yellow-700/40 bg-yellow-900/20 text-yellow-200 text-sm flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
        <p>Danger zone. Deleting a tournament permanently removes linked entries, tables, and transactions.</p>
      </div>

      {message && (
        <div className="mb-4 p-3 rounded-lg border border-felt/40 bg-felt/10 text-felt text-sm">{message}</div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        {/* Desktop table header */}
        <div className="hidden md:grid grid-cols-[80px_1fr_110px_130px_140px_110px] gap-3 px-4 py-3 text-xs uppercase tracking-wider text-gray-500 border-b border-gray-800">
          <span>ID</span>
          <span>Name</span>
          <span>Status</span>
          <span>Players</span>
          <span>Prize Pool</span>
          <span>Action</span>
        </div>

        {loading ? (
          <div className="p-4 text-gray-400 text-sm">Loading tournaments...</div>
        ) : activeTournaments.length === 0 ? (
          <div className="p-4 text-gray-400 text-sm">No active tournaments found.</div>
        ) : (
          <div>
            {activeTournaments.map((t) => (
              <div
                key={t.id}
                className="border-b border-gray-800/70 last:border-b-0"
              >
                {/* Desktop: table row */}
                <div className="hidden md:grid grid-cols-[80px_1fr_110px_130px_140px_110px] gap-3 px-4 py-3 text-sm">
                  <span className="text-gray-300">{t.id}</span>
                  <span className="text-white truncate">{t.name}</span>
                  <span className="text-yellow-300">{t.status}</span>
                  <span className="text-gray-300">{t.entries?.length || 0}</span>
                  <span className="text-gold">{formatCurrencyShort(t.totalPrizePool)}</span>
                  <button
                    onClick={() => handleDeleteOne(t)}
                    disabled={busy}
                    className="px-2 py-1 bg-red-900/40 hover:bg-red-900/70 disabled:opacity-60 text-red-200 rounded text-xs font-medium flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </div>

                {/* Mobile: card */}
                <div className="md:hidden p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{t.name}</p>
                      <p className="text-[11px] text-gray-500">ID {t.id}</p>
                    </div>
                    <span className="text-[11px] px-2 py-0.5 bg-yellow-900/30 text-yellow-300 rounded flex-shrink-0">
                      {t.status}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-3 text-gray-400">
                      <span>{t.entries?.length || 0} players</span>
                      <span className="text-gold">{formatCurrencyShort(t.totalPrizePool)}</span>
                    </div>
                    <button
                      onClick={() => handleDeleteOne(t)}
                      disabled={busy}
                      className="px-3 py-1.5 bg-red-900/40 hover:bg-red-900/70 disabled:opacity-60 text-red-200 rounded text-xs font-medium flex items-center gap-1 flex-shrink-0"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
