import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Calendar, Users } from 'lucide-react';
import type { Tournament } from 'shared';
import { fetchTournaments } from '../api/tournaments';
import { formatCurrencyShort } from '../utils/formatCurrency';

export function HistoryPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments()
      .then(setTournaments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const finished = tournaments.filter((t) => t.status === 'FINISHED');

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Tournament History</h1>

      {loading && <p className="text-gray-400">Loading...</p>}

      {!loading && finished.length === 0 && (
        <div className="text-center py-16">
          <Trophy className="w-12 h-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500">No completed tournaments yet.</p>
          <Link to="/setup" className="text-felt hover:underline text-sm mt-2 inline-block">
            Start your first game
          </Link>
        </div>
      )}

      <div className="space-y-2">
        {finished.map((t) => {
          const winner = t.entries?.find((e) => e.finishPosition === 1);
          const playerCount = t.entries?.length || 0;

          return (
            <Link
              key={t.id}
              to={`/tournament/${t.id}`}
              className="flex items-center justify-between p-5 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-gold" />
                </div>
                <div>
                  <p className="font-semibold text-white">{t.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(t.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {playerCount} players
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gold">{formatCurrencyShort(t.totalPrizePool)}</p>
                {winner && (
                  <p className="text-xs text-gray-400 mt-1">Winner: {winner.player?.name}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
