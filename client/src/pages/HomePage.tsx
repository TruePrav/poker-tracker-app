import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Play, Trophy, Users, DollarSign } from 'lucide-react';
import type { Tournament } from 'shared';
import { fetchTournaments } from '../api/tournaments';
import { formatCurrencyShort } from '../utils/formatCurrency';

export function HomePage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState({ totalTournaments: 0, totalPrizePool: 0, totalPlayers: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchTournaments();
        setTournaments(data);
        const finished = data.filter((t) => t.status === 'FINISHED');
        setStats({
          totalTournaments: finished.length,
          totalPrizePool: finished.reduce((s, t) => s + t.totalPrizePool, 0),
          totalPlayers: new Set(data.flatMap((t) => t.entries?.map((e) => e.playerId) || [])).size,
        });
      } catch {
        // API may not be ready yet
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeTournament =
    tournaments.find((t) => t.status === 'RUNNING' || t.status === 'PAUSED') ||
    tournaments.find((t) => t.status === 'SETUP');

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">Mahtani Poker Room</h1>
        <p className="text-sm sm:text-base text-gray-400">Home Game Tournament Manager</p>
      </div>

      {/* Active Tournament */}
      {activeTournament && (
        <Link
          to={activeTournament.status === 'SETUP' ? `/setup/${activeTournament.id}` : `/tournament/${activeTournament.id}`}
          className="block mb-6 sm:mb-8 p-4 sm:p-6 bg-felt/20 border border-felt rounded-xl hover:bg-felt/30 transition-colors"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-felt font-semibold uppercase tracking-wider mb-1">Active Tournament</p>
              <h2 className="text-lg sm:text-xl font-bold text-white truncate">{activeTournament.name}</h2>
              <p className="text-xs sm:text-sm text-gray-400 mt-1">
                {activeTournament.entries?.length || 0} players &middot; Prize Pool: {formatCurrencyShort(activeTournament.totalPrizePool)}
              </p>
            </div>
            <Play className="w-7 h-7 sm:w-8 sm:h-8 text-felt flex-shrink-0" />
          </div>
        </Link>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <Link
          to="/setup"
          className="p-4 sm:p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-felt active:border-felt transition-colors text-center"
        >
          <PlusCircle className="w-6 h-6 sm:w-8 sm:h-8 text-felt mx-auto mb-2 sm:mb-3" />
          <p className="font-semibold text-white text-sm sm:text-base">New Game</p>
          <p className="hidden sm:block text-xs text-gray-400 mt-1">Start a tournament</p>
        </Link>
        <Link
          to="/players"
          className="p-4 sm:p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gold active:border-gold transition-colors text-center"
        >
          <Users className="w-6 h-6 sm:w-8 sm:h-8 text-gold mx-auto mb-2 sm:mb-3" />
          <p className="font-semibold text-white text-sm sm:text-base">Players</p>
          <p className="hidden sm:block text-xs text-gray-400 mt-1">Manage roster</p>
        </Link>
        <Link
          to="/history"
          className="p-4 sm:p-6 bg-gray-900 border border-gray-800 rounded-xl hover:border-gray-600 active:border-gray-600 transition-colors text-center"
        >
          <Trophy className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-500 mx-auto mb-2 sm:mb-3" />
          <p className="font-semibold text-white text-sm sm:text-base">History</p>
          <p className="hidden sm:block text-xs text-gray-400 mt-1">Past tournaments</p>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="p-3 sm:p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-2 sm:gap-3">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-white">{stats.totalTournaments}</p>
              <p className="text-[10px] sm:text-xs text-gray-400 leading-tight">Tournaments</p>
            </div>
          </div>
        </div>
        <div className="p-3 sm:p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-2 sm:gap-3">
            <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-white truncate">{formatCurrencyShort(stats.totalPrizePool)}</p>
              <p className="text-[10px] sm:text-xs text-gray-400 leading-tight">Prize Pools</p>
            </div>
          </div>
        </div>
        <div className="p-3 sm:p-4 bg-gray-900 border border-gray-800 rounded-lg">
          <div className="flex items-center gap-2 sm:gap-3">
            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-lg sm:text-2xl font-bold text-white">{stats.totalPlayers}</p>
              <p className="text-[10px] sm:text-xs text-gray-400 leading-tight">Players</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Tournaments */}
      {tournaments.filter((t) => t.status === 'FINISHED').length > 0 && (
        <div className="mt-6 sm:mt-8">
          <h3 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Recent Games</h3>
          <div className="space-y-2">
            {tournaments
              .filter((t) => t.status === 'FINISHED')
              .slice(0, 5)
              .map((t) => {
                const winner = t.entries?.find((e) => e.finishPosition === 1);
                return (
                  <Link
                    key={t.id}
                    to={`/tournament/${t.id}`}
                    className="flex items-center justify-between gap-3 p-3 sm:p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-gray-700 active:border-gray-700 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-white text-sm sm:text-base truncate">{t.name}</p>
                      <p className="text-[11px] sm:text-xs text-gray-400 truncate">
                        {new Date(t.date).toLocaleDateString()} &middot; {t.entries?.length || 0} players
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-semibold text-gold text-sm sm:text-base">{formatCurrencyShort(t.totalPrizePool)}</p>
                      {winner && <p className="text-[11px] sm:text-xs text-gray-400 truncate max-w-[120px]">Winner: {winner.player?.name}</p>}
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
