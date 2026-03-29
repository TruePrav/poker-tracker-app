import { Router } from 'express';
import { query } from '../db';

export const playerRoutes = Router();

// GET all active players
playerRoutes.get('/', async (_req, res, next) => {
  try {
    const players = await query(
      'SELECT * FROM "Player" WHERE "isActive" = true ORDER BY "name" ASC'
    );
    res.json(players);
  } catch (err) {
    next(err);
  }
});

// GET player by ID with stats
playerRoutes.get('/:id', async (req, res, next) => {
  try {
    const playerId = Number(req.params.id);
    const players = await query('SELECT * FROM "Player" WHERE "id" = $1 LIMIT 1', [playerId]);
    const player = players[0];
    if (!player) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    const entries = await query(
      `SELECT e.*, row_to_json(t) AS tournament
       FROM "TournamentEntry" e
       LEFT JOIN "Tournament" t ON t."id" = e."tournamentId"
       WHERE e."playerId" = $1
       ORDER BY e."createdAt" DESC`,
      [playerId]
    );

    const transactions = await query(
      'SELECT * FROM "Transaction" WHERE "playerId" = $1 ORDER BY "createdAt" DESC',
      [playerId]
    );

    res.json({ ...player, entries, transactions });
  } catch (err) {
    next(err);
  }
});

// POST create player
playerRoutes.post('/', async (req, res, next) => {
  try {
    const { name, nickname } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
    }
    const now = new Date();
    const created = await query(
      `INSERT INTO "Player" ("name", "nickname", "isActive", "createdAt", "updatedAt")
       VALUES ($1, $2, true, $3, $3)
       RETURNING *`,
      [name.trim(), nickname?.trim() || null, now]
    );
    const player = created[0];
    res.status(201).json(player);
  } catch (err) {
    next(err);
  }
});

// PATCH update player
playerRoutes.patch('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const { name, nickname } = req.body;
    const updates: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      params.push(name.trim());
      updates.push(`"name" = $${params.length}`);
    }
    if (nickname !== undefined) {
      params.push(nickname?.trim() || null);
      updates.push(`"nickname" = $${params.length}`);
    }

    params.push(new Date());
    updates.push(`"updatedAt" = $${params.length}`);
    params.push(id);

    const rows = await query(
      `UPDATE "Player" SET ${updates.join(', ')} WHERE "id" = $${params.length} RETURNING *`,
      params
    );
    const player = rows[0];
    if (!player) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    res.json(player);
  } catch (err) {
    next(err);
  }
});

// DELETE soft-delete player
playerRoutes.delete('/:id', async (req, res, next) => {
  try {
    const rows = await query(
      `UPDATE "Player"
       SET "isActive" = false, "updatedAt" = $1
       WHERE "id" = $2
       RETURNING "id"`,
      [new Date(), Number(req.params.id)]
    );
    if (!rows[0]) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
