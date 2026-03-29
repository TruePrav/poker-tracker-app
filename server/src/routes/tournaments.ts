import { Router } from 'express';
import { query } from '../db.js';

export const tournamentRoutes = Router();

async function getEntryWithPlayer(tournamentId: number, playerId: number) {
  const rows = await query(
    `SELECT e.*, row_to_json(p) AS player
     FROM "TournamentEntry" e
     JOIN "Player" p ON p."id" = e."playerId"
     WHERE e."tournamentId" = $1 AND e."playerId" = $2
     LIMIT 1`,
    [tournamentId, playerId]
  );
  return rows[0];
}

// GET all tournaments
tournamentRoutes.get('/', async (_req, res, next) => {
  try {
    const tournaments = await query('SELECT * FROM "Tournament" ORDER BY "date" DESC');
    if (tournaments.length === 0) {
      return res.json([]);
    }

    const ids = tournaments.map((t: any) => t.id);
    const entries = await query(
      `SELECT e.*, row_to_json(p) AS player
       FROM "TournamentEntry" e
       JOIN "Player" p ON p."id" = e."playerId"
       WHERE e."tournamentId" = ANY($1::int[])`,
      [ids]
    );

    const entryCounts = await query(
      `SELECT "tournamentId", COUNT(*)::int AS count
       FROM "TournamentEntry"
       WHERE "tournamentId" = ANY($1::int[])
       GROUP BY "tournamentId"`,
      [ids]
    );

    const tableCounts = await query(
      `SELECT "tournamentId", COUNT(*)::int AS count
       FROM "TournamentTable"
       WHERE "tournamentId" = ANY($1::int[])
       GROUP BY "tournamentId"`,
      [ids]
    );

    const entriesByTournament = new Map<number, any[]>();
    for (const entry of entries) {
      const list = entriesByTournament.get(entry.tournamentId) || [];
      list.push(entry);
      entriesByTournament.set(entry.tournamentId, list);
    }

    const entryCountMap = new Map<number, number>();
    for (const row of entryCounts) {
      entryCountMap.set(row.tournamentId, row.count);
    }

    const tableCountMap = new Map<number, number>();
    for (const row of tableCounts) {
      tableCountMap.set(row.tournamentId, row.count);
    }

    const result = tournaments.map((t: any) => ({
      ...t,
      entries: entriesByTournament.get(t.id) || [],
      _count: {
        entries: entryCountMap.get(t.id) || 0,
        tables: tableCountMap.get(t.id) || 0,
      },
    }));

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE all active tournaments (SETUP/RUNNING/PAUSED)
tournamentRoutes.delete('/active', async (_req, res, next) => {
  try {
    const rows = await query(
      `DELETE FROM "Tournament"
       WHERE "status" = ANY($1::text[])
       RETURNING "id", "name", "status"`,
      [['SETUP', 'RUNNING', 'PAUSED']]
    );
    res.json({ deletedCount: rows.length, tournaments: rows });
  } catch (err) {
    next(err);
  }
});

// GET tournament by ID (full state)
tournamentRoutes.get('/:id', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const tournamentRows = await query('SELECT * FROM "Tournament" WHERE "id" = $1 LIMIT 1', [tournamentId]);
    const tournament = tournamentRows[0];
    if (!tournament) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    let blindStructure: any = null;
    if (tournament.blindStructureId) {
      const bsRows = await query('SELECT * FROM "BlindStructure" WHERE "id" = $1 LIMIT 1', [tournament.blindStructureId]);
      const bs = bsRows[0];
      if (bs) {
        const levels = await query(
          'SELECT * FROM "BlindLevel" WHERE "blindStructureId" = $1 ORDER BY "level" ASC',
          [bs.id]
        );
        blindStructure = { ...bs, levels };
      }
    }

    const tables = await query(
      `SELECT * FROM "TournamentTable"
       WHERE "tournamentId" = $1 AND "isActive" = true
       ORDER BY "tableNumber" ASC`,
      [tournamentId]
    );

    const tableIds = tables.map((t: any) => t.id);
    const tableEntries = tableIds.length
      ? await query(
          `SELECT e.*, row_to_json(p) AS player
           FROM "TournamentEntry" e
           JOIN "Player" p ON p."id" = e."playerId"
           WHERE e."tableId" = ANY($1::int[])
           ORDER BY e."seatNumber" ASC`,
          [tableIds]
        )
      : [];

    const entriesByTable = new Map<number, any[]>();
    for (const entry of tableEntries) {
      const list = entriesByTable.get(entry.tableId) || [];
      list.push(entry);
      entriesByTable.set(entry.tableId, list);
    }

    const tablesWithEntries = tables.map((t: any) => ({
      ...t,
      entries: entriesByTable.get(t.id) || [],
    }));

    const entries = await query(
      `SELECT e.*, row_to_json(p) AS player
       FROM "TournamentEntry" e
       JOIN "Player" p ON p."id" = e."playerId"
       WHERE e."tournamentId" = $1`,
      [tournamentId]
    );

    const transactions = await query(
      `SELECT tx.*, row_to_json(p) AS player
       FROM "Transaction" tx
       JOIN "Player" p ON p."id" = tx."playerId"
       WHERE tx."tournamentId" = $1
       ORDER BY tx."createdAt" DESC`,
      [tournamentId]
    );

    res.json({
      ...tournament,
      blindStructure,
      tables: tablesWithEntries,
      entries,
      transactions,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE tournament by ID
tournamentRoutes.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const rows = await query(
      `DELETE FROM "Tournament"
       WHERE "id" = $1
       RETURNING "id", "name", "status"`,
      [id]
    );
    const deleted = rows[0];
    if (!deleted) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    res.json({ deleted });
  } catch (err) {
    next(err);
  }
});

// POST create tournament
tournamentRoutes.post('/', async (req, res, next) => {
  try {
    const { name, buyInAmount, topUpAmount, topUpChips, startingChips, blindStructureId, buyInType, buyInPresets } = req.body;
    if (!name || buyInAmount === undefined) {
      return res.status(400).json({ error: 'Name and buyInAmount are required.' });
    }

    const now = new Date();
    const created = await query(
      `INSERT INTO "Tournament"
       ("name","buyInAmount","topUpAmount","topUpChips","startingChips","blindStructureId","buyInType","buyInPresets","updatedAt","createdAt")
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9)
       RETURNING *`,
      [
        name,
        buyInAmount,
        topUpAmount || 0,
        topUpChips || 0,
        startingChips || 10000,
        blindStructureId || null,
        buyInType || 'FIXED',
        buyInPresets || '[]',
        now,
      ]
    );

    res.status(201).json(created[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH update tournament settings
tournamentRoutes.patch('/:id/settings', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const { name, buyInAmount, topUpAmount, topUpChips, startingChips, blindStructureId, buyInType, buyInPresets } = req.body;

    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      params.push(name);
      updates.push(`"name" = $${params.length}`);
    }
    if (buyInAmount !== undefined) {
      params.push(buyInAmount);
      updates.push(`"buyInAmount" = $${params.length}`);
    }
    if (topUpAmount !== undefined) {
      params.push(topUpAmount);
      updates.push(`"topUpAmount" = $${params.length}`);
    }
    if (topUpChips !== undefined) {
      params.push(topUpChips);
      updates.push(`"topUpChips" = $${params.length}`);
    }
    if (startingChips !== undefined) {
      params.push(startingChips);
      updates.push(`"startingChips" = $${params.length}`);
    }
    if (blindStructureId !== undefined) {
      params.push(blindStructureId);
      updates.push(`"blindStructureId" = $${params.length}`);
    }
    if (buyInType !== undefined) {
      params.push(buyInType);
      updates.push(`"buyInType" = $${params.length}`);
    }
    if (buyInPresets !== undefined) {
      params.push(buyInPresets);
      updates.push(`"buyInPresets" = $${params.length}`);
    }

    params.push(new Date());
    updates.push(`"updatedAt" = $${params.length}`);
    params.push(tournamentId);

    const rows = await query(
      `UPDATE "Tournament" SET ${updates.join(', ')} WHERE "id" = $${params.length} RETURNING *`,
      params
    );
    const tournament = rows[0];
    if (!tournament) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    res.json(tournament);
  } catch (err) {
    next(err);
  }
});

// PATCH update tournament status
tournamentRoutes.patch('/:id/status', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const { status } = req.body;
    const finishedAt = status === 'FINISHED' ? new Date() : null;
    const rows = await query(
      `UPDATE "Tournament"
       SET "status" = $1, "finishedAt" = $2, "updatedAt" = $3
       WHERE "id" = $4
       RETURNING *`,
      [status, finishedAt, new Date(), tournamentId]
    );
    const tournament = rows[0];
    if (!tournament) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    res.json(tournament);
  } catch (err) {
    next(err);
  }
});

// PATCH persist timer state
tournamentRoutes.patch('/:id/timer', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const { currentLevel, timerSeconds } = req.body;
    const updates: string[] = [];
    const params: any[] = [];

    if (currentLevel !== undefined) {
      params.push(currentLevel);
      updates.push(`"currentLevel" = $${params.length}`);
    }
    if (timerSeconds !== undefined) {
      params.push(timerSeconds);
      updates.push(`"timerSeconds" = $${params.length}`);
    }
    params.push(new Date());
    updates.push(`"updatedAt" = $${params.length}`);
    params.push(tournamentId);

    const rows = await query(
      `UPDATE "Tournament" SET ${updates.join(', ')} WHERE "id" = $${params.length} RETURNING *`,
      params
    );
    const tournament = rows[0];
    if (!tournament) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    res.json(tournament);
  } catch (err) {
    next(err);
  }
});

// POST add player to tournament
tournamentRoutes.post('/:id/entries', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const { playerId } = req.body;

    const inserted = await query(
      `INSERT INTO "TournamentEntry"
       ("tournamentId","playerId","status","payout","createdAt","updatedAt")
       VALUES ($1,$2,'REGISTERED',0,$3,$3)
       ON CONFLICT ("tournamentId","playerId") DO NOTHING
       RETURNING "id"`,
      [tournamentId, playerId, new Date()]
    );

    // Entry already exists; treat as idempotent success.
    if (!inserted[0]) {
      const existing = await getEntryWithPlayer(tournamentId, playerId);
      return res.status(200).json(existing);
    }

    const entry = await getEntryWithPlayer(tournamentId, playerId);
    res.status(201).json(entry);
  } catch (err) {
    next(err);
  }
});

// DELETE remove player from tournament
tournamentRoutes.delete('/:id/entries/:playerId', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const playerId = Number(req.params.playerId);

    const deleted = await query(
      'DELETE FROM "TournamentEntry" WHERE "tournamentId" = $1 AND "playerId" = $2 RETURNING "id"',
      [tournamentId, playerId]
    );
    if (!deleted[0]) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// PATCH assign seat
tournamentRoutes.patch('/:id/entries/:playerId/seat', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const playerId = Number(req.params.playerId);
    const { tableId, seatNumber } = req.body;
    const status = tableId ? 'SEATED' : 'REGISTERED';

    await query(
      `UPDATE "TournamentEntry"
       SET "tableId" = $1, "seatNumber" = $2, "status" = $3, "updatedAt" = $4
       WHERE "tournamentId" = $5 AND "playerId" = $6`,
      [tableId ?? null, seatNumber ?? null, status, new Date(), tournamentId, playerId]
    );

    const entry = await getEntryWithPlayer(tournamentId, playerId);
    if (!entry) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    res.json(entry);
  } catch (err) {
    next(err);
  }
});

// PATCH eliminate player
tournamentRoutes.patch('/:id/entries/:playerId/eliminate', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const playerId = Number(req.params.playerId);

    const activeRows = await query(
      `SELECT COUNT(*)::int AS count
       FROM "TournamentEntry"
       WHERE "tournamentId" = $1
         AND "status" = ANY($2::text[])`,
      [tournamentId, ['REGISTERED', 'SEATED']]
    );
    const finishPosition = activeRows[0]?.count || 0;

    const now = new Date();
    await query(
      `UPDATE "TournamentEntry"
       SET "status" = 'ELIMINATED',
           "finishPosition" = $1,
           "eliminatedAt" = $2,
           "tableId" = NULL,
           "seatNumber" = NULL,
           "updatedAt" = $3
       WHERE "tournamentId" = $4 AND "playerId" = $5`,
      [finishPosition, now, now, tournamentId, playerId]
    );

    const entry = await getEntryWithPlayer(tournamentId, playerId);
    if (!entry) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    const entries = await query(
      `SELECT e.*, row_to_json(p) AS player
       FROM "TournamentEntry" e
       JOIN "Player" p ON p."id" = e."playerId"
       WHERE e."tournamentId" = $1`,
      [tournamentId]
    );

    res.json({ entry, entries });
  } catch (err) {
    next(err);
  }
});
