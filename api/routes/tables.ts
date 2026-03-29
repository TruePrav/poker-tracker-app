import { Router } from 'express';
import { query, withTransaction } from '../db';
import { MAX_SEATS_PER_TABLE } from '../../shared/src/index';

export const tableRoutes = Router();

async function getTablesWithEntries(tournamentId: number) {
  const tables = await query(
    `SELECT * FROM "TournamentTable"
     WHERE "tournamentId" = $1 AND "isActive" = true
     ORDER BY "tableNumber" ASC`,
    [tournamentId]
  );

  if (tables.length === 0) {
    return [];
  }

  const tableIds = tables.map((t: any) => t.id);
  const entries = await query(
    `SELECT e.*, row_to_json(p) AS player
     FROM "TournamentEntry" e
     JOIN "Player" p ON p."id" = e."playerId"
     WHERE e."tableId" = ANY($1::int[])
     ORDER BY e."seatNumber" ASC`,
    [tableIds]
  );

  const byTable = new Map<number, any[]>();
  for (const entry of entries) {
    const list = byTable.get(entry.tableId) || [];
    list.push(entry);
    byTable.set(entry.tableId, list);
  }

  return tables.map((t: any) => ({ ...t, entries: byTable.get(t.id) || [] }));
}

// GET all tables for a tournament
tableRoutes.get('/:id/tables', async (req, res, next) => {
  try {
    const tables = await getTablesWithEntries(Number(req.params.id));
    res.json(tables);
  } catch (err) {
    next(err);
  }
});

// POST create a table
tableRoutes.post('/:id/tables', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const { tableNumber, tableName } = req.body;

    const rows = await query(
      `INSERT INTO "TournamentTable"
       ("tournamentId","tableNumber","tableName","maxSeats","isActive")
       VALUES ($1,$2,$3,9,true)
       ON CONFLICT ("tournamentId","tableNumber")
       DO UPDATE SET "tableName" = EXCLUDED."tableName"
       RETURNING *`,
      [tournamentId, tableNumber, tableName || `Table ${tableNumber}`]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// DELETE remove a table (must be empty)
tableRoutes.delete('/:id/tables/:tableId', async (req, res, next) => {
  try {
    const tableId = Number(req.params.tableId);

    const seatedCountRows = await query(
      `SELECT COUNT(*)::int AS count
       FROM "TournamentEntry"
       WHERE "tableId" = $1 AND "status" = ANY($2::text[])`,
      [tableId, ['REGISTERED', 'SEATED']]
    );

    if ((seatedCountRows[0]?.count || 0) > 0) {
      return res.status(400).json({ error: 'Cannot delete a table with seated players.' });
    }

    const deleted = await query('DELETE FROM "TournamentTable" WHERE "id" = $1 RETURNING "id"', [tableId]);
    if (!deleted[0]) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// POST shuffle all players randomly across tables
tableRoutes.post('/:id/tables/shuffle', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);

    const entries = await query(
      `SELECT * FROM "TournamentEntry"
       WHERE "tournamentId" = $1 AND "status" = ANY($2::text[])`,
      [tournamentId, ['REGISTERED', 'SEATED']]
    );

    let tables = await query(
      `SELECT * FROM "TournamentTable"
       WHERE "tournamentId" = $1 AND "isActive" = true
       ORDER BY "tableNumber" ASC`,
      [tournamentId]
    );

    if (tables.length === 0 && entries.length > 0) {
      const numTables = Math.ceil(entries.length / MAX_SEATS_PER_TABLE);
      for (let i = 1; i <= numTables; i++) {
        await query(
          `INSERT INTO "TournamentTable"
           ("tournamentId","tableNumber","tableName","maxSeats","isActive")
           VALUES ($1,$2,$3,9,true)`,
          [tournamentId, i, `Table ${i}`]
        );
      }
      tables = await query(
        `SELECT * FROM "TournamentTable"
         WHERE "tournamentId" = $1 AND "isActive" = true
         ORDER BY "tableNumber" ASC`,
        [tournamentId]
      );
    }

    const shuffled = [...entries];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const assignments: { entryId: number; tableId: number; seatNumber: number }[] = [];
    const seatCounters: Record<number, number> = {};
    tables.forEach((t: any) => {
      seatCounters[t.id] = 0;
    });

    for (let i = 0; i < shuffled.length; i++) {
      const tableIndex = i % tables.length;
      const table = tables[tableIndex];
      seatCounters[table.id]++;
      assignments.push({
        entryId: shuffled[i].id,
        tableId: table.id,
        seatNumber: seatCounters[table.id],
      });
    }

    await withTransaction(async (client) => {
      // Clear current seat assignments first to avoid unique-seat collisions during reassignment.
      await client.query(
        `UPDATE "TournamentEntry"
         SET "tableId" = NULL, "seatNumber" = NULL, "updatedAt" = $1
         WHERE "tournamentId" = $2 AND "status" = ANY($3::text[])`,
        [new Date(), tournamentId, ['REGISTERED', 'SEATED']]
      );

      for (const a of assignments) {
        await client.query(
          `UPDATE "TournamentEntry"
           SET "tableId" = $1, "seatNumber" = $2, "status" = 'SEATED', "updatedAt" = $3
           WHERE "id" = $4`,
          [a.tableId, a.seatNumber, new Date(), a.entryId]
        );
      }
    });

    const updatedTables = await getTablesWithEntries(tournamentId);
    res.json(updatedTables);
  } catch (err) {
    next(err);
  }
});

// POST move a player between tables/seats
tableRoutes.post('/:id/tables/move', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const { playerId, toTableId, toSeat } = req.body;

    const existingRows = await query(
      `SELECT * FROM "TournamentEntry"
       WHERE "tournamentId" = $1
         AND "tableId" = $2
         AND "seatNumber" = $3
         AND "status" = ANY($4::text[])
       LIMIT 1`,
      [tournamentId, toTableId, toSeat, ['REGISTERED', 'SEATED']]
    );
    const existing = existingRows[0];

    const movingRows = await query(
      `SELECT * FROM "TournamentEntry"
       WHERE "tournamentId" = $1 AND "playerId" = $2
       LIMIT 1`,
      [tournamentId, playerId]
    );
    const movingPlayer = movingRows[0];
    if (!movingPlayer) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    if (existing) {
      await withTransaction(async (client) => {
        // Temporarily free the moving player's seat to avoid unique-seat collision on swap.
        await client.query(
          `UPDATE "TournamentEntry"
           SET "tableId" = NULL, "seatNumber" = NULL, "updatedAt" = $1
           WHERE "id" = $2`,
          [new Date(), movingPlayer.id]
        );

        await client.query(
          `UPDATE "TournamentEntry"
           SET "tableId" = $1, "seatNumber" = $2, "updatedAt" = $3
           WHERE "id" = $4`,
          [movingPlayer.tableId, movingPlayer.seatNumber, new Date(), existing.id]
        );
        await client.query(
          `UPDATE "TournamentEntry"
           SET "tableId" = $1, "seatNumber" = $2, "status" = 'SEATED', "updatedAt" = $3
           WHERE "id" = $4`,
          [toTableId, toSeat, new Date(), movingPlayer.id]
        );
      });
    } else {
      await query(
        `UPDATE "TournamentEntry"
         SET "tableId" = $1, "seatNumber" = $2, "status" = 'SEATED', "updatedAt" = $3
         WHERE "id" = $4`,
        [toTableId, toSeat, new Date(), movingPlayer.id]
      );
    }

    const updatedTables = await getTablesWithEntries(tournamentId);
    res.json(updatedTables);
  } catch (err) {
    next(err);
  }
});

// GET check table balance
tableRoutes.get('/:id/tables/balance-check', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const tables = await query(
      `SELECT * FROM "TournamentTable"
       WHERE "tournamentId" = $1 AND "isActive" = true`,
      [tournamentId]
    );

    if (tables.length < 2) {
      return res.json({ balanced: true, suggestion: null });
    }

    const tableIds = tables.map((t: any) => t.id);
    const entries = await query(
      `SELECT e.*, row_to_json(p) AS player
       FROM "TournamentEntry" e
       JOIN "Player" p ON p."id" = e."playerId"
       WHERE e."tableId" = ANY($1::int[])
         AND e."status" = ANY($2::text[])
       ORDER BY e."seatNumber" DESC`,
      [tableIds, ['REGISTERED', 'SEATED']]
    );

    const entriesByTable = new Map<number, any[]>();
    for (const entry of entries) {
      const list = entriesByTable.get(entry.tableId) || [];
      list.push(entry);
      entriesByTable.set(entry.tableId, list);
    }

    const counts = tables.map((t: any) => ({
      table: { ...t, entries: entriesByTable.get(t.id) || [] },
      count: (entriesByTable.get(t.id) || []).length,
    }));

    counts.sort((a: any, b: any) => b.count - a.count);
    const max = counts[0];
    const min = counts[counts.length - 1];

    if (max.count - min.count < 2) {
      return res.json({ balanced: true, suggestion: null });
    }

    const playerToMove = max.table.entries[0];
    const occupiedSeats = new Set(min.table.entries.map((e: any) => e.seatNumber));
    let suggestedSeat = 1;
    for (let s = 1; s <= MAX_SEATS_PER_TABLE; s++) {
      if (!occupiedSeats.has(s)) {
        suggestedSeat = s;
        break;
      }
    }

    res.json({
      balanced: false,
      suggestion: {
        playerName: playerToMove.player?.name || 'Unknown',
        playerId: playerToMove.playerId,
        fromTableNumber: max.table.tableNumber,
        fromTableId: max.table.id,
        toTableNumber: min.table.tableNumber,
        toTableId: min.table.id,
        suggestedSeat,
      },
    });
  } catch (err) {
    next(err);
  }
});
