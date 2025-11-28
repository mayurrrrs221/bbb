import { Router } from 'express';
import { db } from '../db';
import { AuthRequest } from '../middleware/auth';

export const reportsRouter = Router();

reportsRouter.get('/csv', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const { from, to } = req.query;

    const where: any = { userId };
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from as string);
      if (to) where.date.lte = new Date(to as string);
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const headers = ['Date', 'Type', 'Title', 'Amount', 'Category', 'Notes'];
    const rows = transactions.map((t) => [
      t.date.toISOString().split('T')[0],
      t.type,
      t.title,
      t.amount,
      t.category,
      t.notes || '',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="transactions-${Date.now()}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ ok: false, error: 'Failed to export CSV' });
  }
});
