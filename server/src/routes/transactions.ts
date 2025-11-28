import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { parse } from 'csv-parse/sync';

export const transactionsRouter = Router();

const createTransactionSchema = z.object({
  type: z.enum(['expense', 'income']),
  title: z.string().min(1).max(200),
  amount: z.number().positive(),
  category: z.string().min(1),
  paymentMode: z.string().optional(),
  notes: z.string().max(1000).optional(),
  date: z.string().datetime(),
  isRegret: z.boolean().optional(),
  location: z.string().optional(),
});

const updateTransactionSchema = createTransactionSchema.partial();

transactionsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const {
      from,
      to,
      category,
      minAmount,
      maxAmount,
      type,
      limit = '50',
      offset = '0',
    } = req.query;

    const where: any = { userId };

    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from as string);
      if (to) where.date.lte = new Date(to as string);
    }

    if (category) where.category = category;
    if (type) where.type = type;

    if (minAmount || maxAmount) {
      where.amount = {};
      if (minAmount) where.amount.gte = parseFloat(minAmount as string);
      if (maxAmount) where.amount.lte = parseFloat(maxAmount as string);
    }

    const [transactions, total] = await Promise.all([
      db.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        take: parseInt(limit as string),
        skip: parseInt(offset as string),
      }),
      db.transaction.count({ where }),
    ]);

    res.json({
      ok: true,
      data: {
        transactions,
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      },
    });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to fetch transactions' });
  }
});

transactionsRouter.post(
  '/',
  validateRequest(createTransactionSchema),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.uid;
      const data = req.body;

      const transaction = await db.transaction.create({
        data: {
          ...data,
          userId,
          date: new Date(data.date),
          synced: true,
        },
      });

      res.status(201).json({ ok: true, data: transaction });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Failed to create transaction' });
    }
  }
);

transactionsRouter.put(
  '/:id',
  validateRequest(updateTransactionSchema),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.uid;
      const { id } = req.params;
      const data = req.body;

      const existing = await db.transaction.findFirst({
        where: { id, userId },
      });

      if (!existing) {
        return res.status(404).json({ ok: false, error: 'Transaction not found' });
      }

      const updateData: any = { ...data };
      if (data.date) updateData.date = new Date(data.date);

      const transaction = await db.transaction.update({
        where: { id },
        data: updateData,
      });

      res.json({ ok: true, data: transaction });
    } catch (error) {
      res.status(500).json({ ok: false, error: 'Failed to update transaction' });
    }
  }
);

transactionsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    const existing = await db.transaction.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ ok: false, error: 'Transaction not found' });
    }

    await db.transaction.delete({ where: { id } });

    res.json({ ok: true, data: { id } });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to delete transaction' });
  }
});

transactionsRouter.post('/import', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const { csvData } = req.body;

    if (!csvData || typeof csvData !== 'string') {
      return res.status(400).json({ ok: false, error: 'Invalid CSV data' });
    }

    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
    });

    const transactions = (records as any[]).map((record: any) => ({
      userId,
      type: record.type || 'expense',
      title: record.title || 'Imported',
      amount: parseFloat(record.amount) || 0,
      category: record.category || 'Other',
      paymentMode: record.paymentMode,
      notes: record.notes,
      date: record.date ? new Date(record.date) : new Date(),
      synced: true,
    }));

    const created = await db.transaction.createMany({
      data: transactions,
    });

    res.json({ ok: true, data: { imported: created.count } });
  } catch (error) {
    res.status(500).json({ ok: false, error: 'Failed to import CSV' });
  }
});
