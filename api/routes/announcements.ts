import { Router } from 'express';
import { query } from '../db';

export const announcementRoutes = Router();

let tableReady = false;

// Created on demand so this works against an existing database without a
// separate migration step (same defensive approach the blind routes use).
async function ensureTable() {
  if (tableReady) return;
  await query(`
    CREATE TABLE IF NOT EXISTS "Announcement" (
      "id" SERIAL PRIMARY KEY,
      "tournamentId" INTEGER NOT NULL,
      "kind" TEXT NOT NULL DEFAULT 'TTS',
      "text" TEXT,
      "audioKey" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "playedAt" TIMESTAMP(3)
    )
  `);
  await query(
    `CREATE INDEX IF NOT EXISTS "Announcement_pending_idx"
     ON "Announcement" ("tournamentId", "playedAt")`
  );
  tableReady = true;
}

// GET announcements that the display has not played yet
announcementRoutes.get('/:id/announcements/pending', async (req, res, next) => {
  try {
    await ensureTable();
    const rows = await query(
      `SELECT * FROM "Announcement"
       WHERE "tournamentId" = $1 AND "playedAt" IS NULL
       ORDER BY "id" ASC
       LIMIT 20`,
      [Number(req.params.id)]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET recent announcements (for a log / debugging)
announcementRoutes.get('/:id/announcements', async (req, res, next) => {
  try {
    await ensureTable();
    const rows = await query(
      `SELECT * FROM "Announcement"
       WHERE "tournamentId" = $1
       ORDER BY "id" DESC
       LIMIT 50`,
      [Number(req.params.id)]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// POST queue an announcement for the display to speak / play
announcementRoutes.post('/:id/announcements', async (req, res, next) => {
  try {
    await ensureTable();
    const tournamentId = Number(req.params.id);
    const { text, kind, audioKey } = req.body || {};

    const resolvedKind = kind === 'AUDIO' ? 'AUDIO' : 'TTS';
    if (resolvedKind === 'TTS' && (!text || !String(text).trim())) {
      return res.status(400).json({ error: 'text is required for a spoken announcement.' });
    }
    if (resolvedKind === 'AUDIO' && !audioKey) {
      return res.status(400).json({ error: 'audioKey is required for an audio announcement.' });
    }

    const rows = await query(
      `INSERT INTO "Announcement" ("tournamentId","kind","text","audioKey","createdAt")
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [tournamentId, resolvedKind, text ? String(text).trim() : null, audioKey || null, new Date()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST mark an announcement as played so it is not repeated
announcementRoutes.post('/:id/announcements/:announcementId/played', async (req, res, next) => {
  try {
    await ensureTable();
    const rows = await query(
      `UPDATE "Announcement"
       SET "playedAt" = $1
       WHERE "id" = $2 AND "tournamentId" = $3 AND "playedAt" IS NULL
       RETURNING *`,
      [new Date(), Number(req.params.announcementId), Number(req.params.id)]
    );
    // Already played is fine — the display may retry.
    res.json(rows[0] || { alreadyPlayed: true });
  } catch (err) {
    next(err);
  }
});

// DELETE clear the pending queue (panic button if something is stuck)
announcementRoutes.delete('/:id/announcements/pending', async (req, res, next) => {
  try {
    await ensureTable();
    const rows = await query(
      `UPDATE "Announcement"
       SET "playedAt" = $1
       WHERE "tournamentId" = $2 AND "playedAt" IS NULL
       RETURNING "id"`,
      [new Date(), Number(req.params.id)]
    );
    res.json({ clearedCount: rows.length });
  } catch (err) {
    next(err);
  }
});
