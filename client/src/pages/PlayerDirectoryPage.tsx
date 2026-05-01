import { useEffect, useState } from 'react';
import { Plus, Trash2, Search } from 'lucide-react';
import { usePlayerStore } from '../stores/usePlayerStore';

export function PlayerDirectoryPage() {
  const { players, isLoading, fetchPlayers, addPlayer, removePlayer } = usePlayerStore();
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addPlayer(newName.trim());
    setNewName('');
  };

  const filtered = players.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Players</h1>
        <span className="text-sm text-gray-400">{players.length} total</span>
      </div>

      {/* Add Player */}
      <div className="flex gap-2 mb-4 sm:mb-6">
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Enter player name..."
          className="flex-1 min-w-0 px-3 sm:px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-felt"
        />
        <button
          onClick={handleAdd}
          disabled={!newName.trim()}
          className="px-4 sm:px-5 py-2.5 bg-felt hover:bg-felt-dark disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-2 transition-colors flex-shrink-0"
        >
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Player</span><span className="sm:hidden">Add</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search players..."
          className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-700 text-sm"
        />
      </div>

      {/* Player List */}
      <div className="space-y-1">
        {filtered.map((p) => (
          <div
            key={p.id}
            className="flex items-center justify-between px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
          >
            <div>
              <p className="font-medium text-white">{p.name}</p>
              <p className="text-xs text-gray-500">Added {new Date(p.createdAt).toLocaleDateString()}</p>
            </div>
            <button
              onClick={() => removePlayer(p.id)}
              className="p-2 text-gray-600 hover:text-red-400 transition-colors"
              title="Remove player"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && !isLoading && (
          <p className="text-center text-gray-500 py-12">
            {search ? 'No players match your search.' : 'No players yet. Add one above.'}
          </p>
        )}
      </div>
    </div>
  );
}
