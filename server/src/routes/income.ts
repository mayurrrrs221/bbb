import { Router } from 'express';
import { db } from '../db';
import { AuthRequest } from '../middleware/auth';
import { z } from 'zod';

export const incomeRouter = Router();

const incomeSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  category: z.string().min(1),
  frequency: z.string(),
  date: z.string().datetime(),
  notes: z.string().optional(),
});

incomeRouter.get('/', async (req: AuthRequest, res) => {
  const userId = req.user!.uid;
  const incomes = await db.income.findMany({ where: { userId }, orderBy: { date: 'desc' } });
  res.json({ ok: true, data: incomes });
});

incomeRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const data = incomeSchema.parse(req.body);
    const created = await db.income.create({
      data: { ...data, userId, date: new Date(data.date) },
    });
    res.status(201).json({ ok: true, data: created });
  } catch (err) {
    res.status(400).json({ ok: false, error: 'Invalid income payload' });
  }
});
