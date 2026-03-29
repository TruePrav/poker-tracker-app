import { Router } from 'express';
import { query, withTransaction } from '../db';

export const transactionRoutes = Router();

async function createPrizeTransaction(tournamentId: number, playerId: number, type: string, amount: number) {
  return withTransaction(async (client) => {
    const txRows = await client.query(
      `INSERT INTO "Transaction" ("tournamentId","playerId","type","amount","createdAt")
       VALUES ($1,$2,$3,$4,$5)
       RETURNING *`,
      [tournamentId, playerId, type, amount, new Date()]
    );

    const prizeRows = await client.query(
      `UPDATE "Tournament"
       SET "totalPrizePool" = "totalPrizePool" + $1, "updatedAt" = $2
       WHERE "id" = $3
       RETURNING "totalPrizePool"`,
      [amount, new Date(), tournamentId]
    );

    const tx = txRows.rows[0];
    const playerRows = await client.query('SELECT * FROM "Player" WHERE "id" = $1 LIMIT 1', [playerId]);
    tx.player = playerRows.rows[0] || null;
    return { transaction: tx, totalPrizePool: prizeRows.rows[0]?.totalPrizePool || 0 };
  });
}

// GET all transactions for a tournament
transactionRoutes.get('/:id/transactions', async (req, res, next) => {
  try {
    const transactions = await query(
      `SELECT tx.*, row_to_json(p) AS player
       FROM "Transaction" tx
       JOIN "Player" p ON p."id" = tx."playerId"
       WHERE tx."tournamentId" = $1
       ORDER BY tx."createdAt" DESC`,
      [Number(req.params.id)]
    );
    res.json(transactions);
  } catch (err) {
    next(err);
  }
});

// POST record buy-in
transactionRoutes.post('/:id/transactions/buyin', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const { playerId } = req.body;

    const tournamentRows = await query('SELECT "buyInAmount" FROM "Tournament" WHERE "id" = $1 LIMIT 1', [tournamentId]);
    const tournament = tournamentRows[0];
    if (!tournament) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    const result = await createPrizeTransaction(tournamentId, playerId, 'BUY_IN', tournament.buyInAmount);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST record rebuy
transactionRoutes.post('/:id/transactions/rebuy', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const { playerId, amount: customAmount } = req.body;

    const tournamentRows = await query('SELECT "buyInAmount" FROM "Tournament" WHERE "id" = $1 LIMIT 1', [tournamentId]);
    const tournament = tournamentRows[0];
    if (!tournament) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    const rebuyAmount = customAmount != null ? Number(customAmount) : tournament.buyInAmount;
    const result = await createPrizeTransaction(tournamentId, playerId, 'REBUY', rebuyAmount);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST record top-up
transactionRoutes.post('/:id/transactions/topup', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const { playerId } = req.body;

    // Enforce 1 top-up per player per tournament
    const existing = await query(
      `SELECT "id" FROM "Transaction" WHERE "tournamentId" = $1 AND "playerId" = $2 AND "type" = 'TOP_UP' LIMIT 1`,
      [tournamentId, playerId]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Player has already received a top-up' });
    }

    const tournamentRows = await query('SELECT "topUpAmount" FROM "Tournament" WHERE "id" = $1 LIMIT 1', [tournamentId]);
    const tournament = tournamentRows[0];
    if (!tournament) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    const result = await createPrizeTransaction(tournamentId, playerId, 'TOP_UP', tournament.topUpAmount);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// POST record payout
transactionRoutes.post('/:id/transactions/payout', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const { playerId, amount } = req.body;

    const result = await withTransaction(async (client) => {
      const txRows = await client.query(
        `INSERT INTO "Transaction" ("tournamentId","playerId","type","amount","createdAt")
         VALUES ($1,$2,'PAYOUT',$3,$4)
         RETURNING *`,
        [tournamentId, playerId, amount, new Date()]
      );

      await client.query(
        `UPDATE "TournamentEntry"
         SET "payout" = $1, "updatedAt" = $2
         WHERE "tournamentId" = $3 AND "playerId" = $4`,
        [amount, new Date(), tournamentId, playerId]
      );

      const tx = txRows.rows[0];
      const playerRows = await client.query('SELECT * FROM "Player" WHERE "id" = $1 LIMIT 1', [playerId]);
      tx.player = playerRows.rows[0] || null;
      return { transaction: tx };
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// DELETE undo a transaction (reverses prize pool impact)
transactionRoutes.delete('/:id/transactions/:txId', async (req, res, next) => {
  try {
    const tournamentId = Number(req.params.id);
    const txId = Number(req.params.txId);

    const result = await withTransaction(async (client) => {
      // Fetch the transaction first
      const txRows = await client.query(
        `SELECT * FROM "Transaction" WHERE "id" = $1 AND "tournamentId" = $2 LIMIT 1`,
        [txId, tournamentId]
      );
      const tx = txRows.rows[0];
      if (!tx) return null;

      // Delete the transaction
      await client.query(`DELETE FROM "Transaction" WHERE "id" = $1`, [txId]);

      // Reverse prize pool impact for money-in transactions
      let totalPrizePool = 0;
      if (['BUY_IN', 'REBUY', 'TOP_UP'].includes(tx.type)) {
        const prizeRows = await client.query(
          `UPDATE "Tournament"
           SET "totalPrizePool" = GREATEST(0, "totalPrizePool" - $1), "updatedAt" = $2
           WHERE "id" = $3
           RETURNING "totalPrizePool"`,
          [tx.amount, new Date(), tournamentId]
        );
        totalPrizePool = prizeRows.rows[0]?.totalPrizePool ?? 0;
      }

      return { deletedId: txId, type: tx.type, totalPrizePool };
    });

    if (!result) return res.status(404).json({ error: 'Transaction not found.' });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET prize pool
transactionRoutes.get('/:id/prize-pool', async (req, res, next) => {
  try {
    const rows = await query(
      'SELECT "totalPrizePool" FROM "Tournament" WHERE "id" = $1 LIMIT 1',
      [Number(req.params.id)]
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
