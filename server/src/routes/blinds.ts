import { Router } from 'express';
import { query, withTransaction } from '../db.js';

export const blindRoutes = Router();

type BlindSchemaMap = {
  structure: {
    id: string;
    name: string;
    isDefault?: string;
    createdAt?: string;
  };
  level: {
    id?: string;
    blindStructureId: string;
    level: string;
    smallBlind: string;
    bigBlind: string;
    ante: string;
    durationMinutes: string;
    isBreak: string;
  };
};

function quoteIdent(v: string) {
  return `"${v.replace(/"/g, '""')}"`;
}

function pickColumn(columns: string[], candidates: string[], required = true) {
  for (const c of candidates) {
    if (columns.includes(c)) return c;
  }
  const lower = new Map(columns.map((c) => [c.toLowerCase(), c]));
  for (const c of candidates) {
    const found = lower.get(c.toLowerCase());
    if (found) return found;
  }
  if (required) {
    throw new Error(
      `Missing required column. Expected one of: ${candidates.join(', ')}. Available: ${columns.join(', ')}`
    );
  }
  return undefined;
}

async function resolveBlindSchema(): Promise<BlindSchemaMap> {
  let structureColsRows = await query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'BlindStructure'`
  );
  let levelColsRows = await query(
    `SELECT column_name, data_type
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'BlindLevel'`
  );

  const structureCols = structureColsRows.map((r: any) => r.column_name as string);
  let levelCols = levelColsRows.map((r: any) => r.column_name as string);

  const detectStructureName = () => {
    const explicit = pickColumn(
      structureCols,
      ['name', 'Name', 'structureName', 'structure_name', 'blindStructureName', 'blind_structure_name', 'title', 'label'],
      false
    );
    if (explicit) return explicit;

    const withName = structureCols.find((c) => c.toLowerCase().includes('name'));
    if (withName) return withName;

    const textCols = structureColsRows
      .filter((r: any) => ['text', 'character varying', 'character'].includes(String(r.data_type).toLowerCase()))
      .map((r: any) => r.column_name as string)
      .filter((c) => !['id', 'isdefault', 'createdat'].includes(c.toLowerCase()));
    if (textCols.length > 0) return textCols[0];

    return undefined;
  };

  let detectedName = detectStructureName();
  if (!detectedName) {
    await query(
      `ALTER TABLE "BlindStructure"
       ADD COLUMN IF NOT EXISTS "name" text NOT NULL DEFAULT 'Custom Structure'`
    );
    structureColsRows = await query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'BlindStructure'`
    );
    const refreshed = structureColsRows.map((r: any) => r.column_name as string);
    detectedName = pickColumn(refreshed, ['name', 'Name']) || undefined;
    if (!detectedName) {
      throw new Error(
        `BlindStructure is missing a writable name column even after auto-migration. Columns found: ${refreshed.join(', ')}`
      );
    }
  }

  const hasSmallBlind = Boolean(
    pickColumn(levelCols, ['smallBlind', 'small_blind', 'SmallBlind'], false)
  );
  if (!hasSmallBlind) {
    await query(
      `ALTER TABLE "BlindLevel"
       ADD COLUMN IF NOT EXISTS "smallBlind" integer`
    );
    // Best-effort backfill for existing rows.
    await query(
      `UPDATE "BlindLevel"
       SET "smallBlind" = CASE
         WHEN "smallBlind" IS NOT NULL THEN "smallBlind"
         WHEN "bigBlind" IS NOT NULL THEN GREATEST(1, "bigBlind" / 2)
         ELSE 0
       END`
    );
    levelColsRows = await query(
      `SELECT column_name, data_type
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'BlindLevel'`
    );
    levelCols = levelColsRows.map((r: any) => r.column_name as string);
  }

  return {
    structure: {
      id: pickColumn(structureCols, ['id', 'Id'])!,
      name: detectedName,
      isDefault: pickColumn(structureCols, ['isDefault', 'is_default', 'IsDefault'], false),
      createdAt: pickColumn(structureCols, ['createdAt', 'created_at', 'CreatedAt'], false),
    },
    level: {
      id: pickColumn(levelCols, ['id', 'Id'], false),
      blindStructureId: pickColumn(levelCols, ['blindStructureId', 'blind_structure_id', 'BlindStructureId'])!,
      level: pickColumn(levelCols, ['level', 'Level'])!,
      smallBlind: pickColumn(levelCols, ['smallBlind', 'small_blind', 'SmallBlind'])!,
      bigBlind: pickColumn(levelCols, ['bigBlind', 'big_blind', 'BigBlind'])!,
      ante: pickColumn(levelCols, ['ante', 'Ante'])!,
      durationMinutes: pickColumn(levelCols, ['durationMinutes', 'duration_minutes', 'DurationMinutes'])!,
      isBreak: pickColumn(levelCols, ['isBreak', 'is_break', 'IsBreak'])!,
    },
  };
}

async function getStructuresWithLevels() {
  const schema = await resolveBlindSchema();
  const s = schema.structure;
  const l = schema.level;

  const orderByDefault = s.isDefault ? `${quoteIdent(s.isDefault)} DESC, ` : '';
  const structures = await query(
    `SELECT
      ${quoteIdent(s.id)} AS "id",
      ${quoteIdent(s.name)} AS "name",
      ${s.isDefault ? `${quoteIdent(s.isDefault)} AS "isDefault"` : 'false AS "isDefault"'},
      ${s.createdAt ? `${quoteIdent(s.createdAt)} AS "createdAt"` : 'NOW() AS "createdAt"'}
     FROM "BlindStructure"
     ORDER BY ${orderByDefault}${quoteIdent(s.name)} ASC`
  );

  const levels = await query(
    `SELECT
      ${l.id ? `${quoteIdent(l.id)} AS "id",` : ''}
      ${quoteIdent(l.blindStructureId)} AS "blindStructureId",
      ${quoteIdent(l.level)} AS "level",
      ${quoteIdent(l.smallBlind)} AS "smallBlind",
      ${quoteIdent(l.bigBlind)} AS "bigBlind",
      ${quoteIdent(l.ante)} AS "ante",
      ${quoteIdent(l.durationMinutes)} AS "durationMinutes",
      ${quoteIdent(l.isBreak)} AS "isBreak"
     FROM "BlindLevel"
     ORDER BY ${quoteIdent(l.blindStructureId)} ASC, ${quoteIdent(l.level)} ASC`
  );

  const levelsByStructure = new Map<number, any[]>();
  for (const level of levels) {
    const list = levelsByStructure.get(level.blindStructureId) || [];
    list.push(level);
    levelsByStructure.set(level.blindStructureId, list);
  }

  return structures.map((st: any) => ({
    ...st,
    levels: levelsByStructure.get(st.id) || [],
  }));
}

// GET all blind structures
blindRoutes.get('/', async (_req, res, next) => {
  try {
    const result = await getStructuresWithLevels();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET blind structure by ID
blindRoutes.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const all = await getStructuresWithLevels();
    const found = all.find((x: any) => x.id === id);
    if (!found) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    res.json(found);
  } catch (err) {
    next(err);
  }
});

// POST create blind structure
blindRoutes.post('/', async (req, res, next) => {
  try {
    const { name, levels } = req.body;
    const schema = await resolveBlindSchema();
    const s = schema.structure;
    const l = schema.level;

    const created = await withTransaction(async (client) => {
      const structureCols = [quoteIdent(s.name)];
      const structureVals: any[] = [name];
      if (s.isDefault) {
        structureCols.push(quoteIdent(s.isDefault));
        structureVals.push(false);
      }
      if (s.createdAt) {
        structureCols.push(quoteIdent(s.createdAt));
        structureVals.push(new Date());
      }

      const placeholders = structureVals.map((_, i) => `$${i + 1}`).join(', ');
      const insertStructure = await client.query(
        `INSERT INTO "BlindStructure" (${structureCols.join(', ')})
         VALUES (${placeholders})
         RETURNING ${quoteIdent(s.id)} AS "id", ${quoteIdent(s.name)} AS "name"`,
        structureVals
      );
      const structure = insertStructure.rows[0];

      for (let i = 0; i < levels.length; i++) {
        const row = levels[i];
        await client.query(
          `INSERT INTO "BlindLevel"
          (${quoteIdent(l.blindStructureId)}, ${quoteIdent(l.level)}, ${quoteIdent(l.smallBlind)}, ${quoteIdent(
            l.bigBlind
          )}, ${quoteIdent(l.ante)}, ${quoteIdent(l.durationMinutes)}, ${quoteIdent(l.isBreak)})
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [structure.id, i + 1, row.smallBlind, row.bigBlind, row.ante || 0, row.durationMinutes || 15, row.isBreak || false]
        );
      }

      const levelsRows = await client.query(
        `SELECT
          ${l.id ? `${quoteIdent(l.id)} AS "id",` : ''}
          ${quoteIdent(l.blindStructureId)} AS "blindStructureId",
          ${quoteIdent(l.level)} AS "level",
          ${quoteIdent(l.smallBlind)} AS "smallBlind",
          ${quoteIdent(l.bigBlind)} AS "bigBlind",
          ${quoteIdent(l.ante)} AS "ante",
          ${quoteIdent(l.durationMinutes)} AS "durationMinutes",
          ${quoteIdent(l.isBreak)} AS "isBreak"
         FROM "BlindLevel"
         WHERE ${quoteIdent(l.blindStructureId)} = $1
         ORDER BY ${quoteIdent(l.level)} ASC`,
        [structure.id]
      );
      return { ...structure, levels: levelsRows.rows };
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

// PATCH update blind structure name
blindRoutes.patch('/:id', async (req, res, next) => {
  try {
    const { name } = req.body;
    const schema = await resolveBlindSchema();
    const s = schema.structure;
    const rows = await query(
      `UPDATE "BlindStructure"
       SET ${quoteIdent(s.name)} = $1
       WHERE ${quoteIdent(s.id)} = $2
       RETURNING ${quoteIdent(s.id)} AS "id", ${quoteIdent(s.name)} AS "name"`,
      [name, Number(req.params.id)]
    );
    const structure = rows[0];
    if (!structure) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    res.json(structure);
  } catch (err) {
    next(err);
  }
});

// PUT replace all levels in a structure
blindRoutes.put('/:id/levels', async (req, res, next) => {
  try {
    const structureId = Number(req.params.id);
    const { levels } = req.body;
    const schema = await resolveBlindSchema();
    const l = schema.level;
    const s = schema.structure;

    const structure = await withTransaction(async (client) => {
      const existing = await client.query(
        `SELECT ${quoteIdent(s.id)} AS "id", ${quoteIdent(s.name)} AS "name"
         FROM "BlindStructure"
         WHERE ${quoteIdent(s.id)} = $1
         LIMIT 1`,
        [structureId]
      );
      if (!existing.rows[0]) {
        return null;
      }

      await client.query(`DELETE FROM "BlindLevel" WHERE ${quoteIdent(l.blindStructureId)} = $1`, [structureId]);
      for (let i = 0; i < levels.length; i++) {
        const row = levels[i];
        await client.query(
          `INSERT INTO "BlindLevel"
          (${quoteIdent(l.blindStructureId)}, ${quoteIdent(l.level)}, ${quoteIdent(l.smallBlind)}, ${quoteIdent(
            l.bigBlind
          )}, ${quoteIdent(l.ante)}, ${quoteIdent(l.durationMinutes)}, ${quoteIdent(l.isBreak)})
          VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [structureId, i + 1, row.smallBlind, row.bigBlind, row.ante || 0, row.durationMinutes || 15, row.isBreak || false]
        );
      }

      const levelsRows = await client.query(
        `SELECT
          ${l.id ? `${quoteIdent(l.id)} AS "id",` : ''}
          ${quoteIdent(l.blindStructureId)} AS "blindStructureId",
          ${quoteIdent(l.level)} AS "level",
          ${quoteIdent(l.smallBlind)} AS "smallBlind",
          ${quoteIdent(l.bigBlind)} AS "bigBlind",
          ${quoteIdent(l.ante)} AS "ante",
          ${quoteIdent(l.durationMinutes)} AS "durationMinutes",
          ${quoteIdent(l.isBreak)} AS "isBreak"
         FROM "BlindLevel"
         WHERE ${quoteIdent(l.blindStructureId)} = $1
         ORDER BY ${quoteIdent(l.level)} ASC`,
        [structureId]
      );
      return { ...existing.rows[0], levels: levelsRows.rows };
    });

    if (!structure) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    res.json(structure);
  } catch (err) {
    next(err);
  }
});

// DELETE blind structure
blindRoutes.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const inUseRows = await query('SELECT COUNT(*)::int AS count FROM "Tournament" WHERE "blindStructureId" = $1', [id]);
    if (inUseRows[0]?.count > 0) {
      return res.status(400).json({ error: 'Cannot delete a blind structure that is in use.' });
    }
    const schema = await resolveBlindSchema();
    const s = schema.structure;
    const deleted = await query(
      `DELETE FROM "BlindStructure" WHERE ${quoteIdent(s.id)} = $1 RETURNING ${quoteIdent(s.id)} AS "id"`,
      [id]
    );
    if (!deleted[0]) {
      return res.status(404).json({ error: 'Record not found.' });
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
