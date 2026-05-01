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
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6">Tournament History</h1>

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
              className="flex items-center justify-between gap-3 p-3 sm:p-5 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-700 active:border-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className="w-9 h-9 sm:w-10 sm:h-10 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-gold" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-white text-sm sm:text-base truncate">{t.name}</p>
                  <div className="flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-gray-400">
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
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gold text-sm sm:text-base">{formatCurrencyShort(t.totalPrizePool)}</p>
                {winner && (
                  <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5 sm:mt-1 truncate max-w-[120px]">Winner: {winner.player?.name}</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
