import { Router } from 'express';
import { query } from '../db';

export const statsRoutes = Router();

// GET leaderboard
statsRoutes.get('/leaderboard', async (_req, res, next) => {
  try {
    const players = await query('SELECT * FROM "Player" WHERE "isActive" = true');
    if (players.length === 0) {
      return res.json([]);
    }

    const playerIds = players.map((p: any) => p.id);

    const entries = await query(
      `SELECT * FROM "TournamentEntry"
       WHERE "playerId" = ANY($1::int[])`,
      [playerIds]
    );

    const transactions = await query(
      `SELECT * FROM "Transaction"
       WHERE "playerId" = ANY($1::int[])`,
      [playerIds]
    );

    const entriesByPlayer = new Map<number, any[]>();
    for (const e of entries) {
      const list = entriesByPlayer.get(e.playerId) || [];
      list.push(e);
      entriesByPlayer.set(e.playerId, list);
    }

    const txByPlayer = new Map<number, any[]>();
    for (const t of transactions) {
      const list = txByPlayer.get(t.playerId) || [];
      list.push(t);
      txByPlayer.set(t.playerId, list);
    }

    const leaderboard: Array<{
      playerId: number;
      playerName: string;
      gamesPlayed: number;
      wins: number;
      totalInvested: number;
      totalWon: number;
      roi: number;
    }> = players
      .map((p: any) => {
        const playerEntries = entriesByPlayer.get(p.id) || [];
        const playerTx = txByPlayer.get(p.id) || [];
        const gamesPlayed = playerEntries.length;
        const wins = playerEntries.filter((e) => e.finishPosition === 1).length;
        const totalInvested = playerTx
          .filter((t) => ['BUY_IN', 'REBUY', 'TOP_UP'].includes(t.type))
          .reduce((sum, t) => sum + t.amount, 0);
        const totalWon = playerTx
          .filter((t) => t.type === 'PAYOUT')
          .reduce((sum, t) => sum + t.amount, 0);

        return {
          playerId: p.id,
          playerName: p.name,
          gamesPlayed,
          wins,
          totalInvested,
          totalWon,
          roi: totalInvested > 0 ? ((totalWon - totalInvested) / totalInvested) * 100 : 0,
        };
      })
      .filter((p: any) => p.gamesPlayed > 0)
      .sort((a: any, b: any) => b.totalWon - b.totalInvested - (a.totalWon - a.totalInvested));

    res.json(leaderboard);
  } catch (err) {
    next(err);
  }
});

// GET summary stats
statsRoutes.get('/summary', async (_req, res, next) => {
  try {
    const totalTournamentsRows = await query(
      `SELECT COUNT(*)::int AS count FROM "Tournament" WHERE "status" = 'FINISHED'`
    );
    const totalPrizeRows = await query(
      `SELECT COALESCE(SUM("totalPrizePool"), 0)::int AS sum FROM "Tournament" WHERE "status" = 'FINISHED'`
    );
    const totalPlayersRows = await query(
      `SELECT COUNT(*)::int AS count FROM "Player" WHERE "isActive" = true`
    );

    res.json({
      totalTournaments: totalTournamentsRows[0]?.count || 0,
      totalPrizePool: totalPrizeRows[0]?.sum || 0,
      totalPlayers: totalPlayersRows[0]?.count || 0,
    });
  } catch (err) {
    next(err);
  }
});
