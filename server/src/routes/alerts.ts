import { Router } from 'express';
import { db } from '../db';
import { AuthRequest } from '../middleware/auth';

export const alertsRouter = Router();

alertsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const alerts = await db.alert.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ ok: true, data: alerts });
  } catch (error) {
    console.error('List alerts error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch alerts' });
  }
});

alertsRouter.post('/mark-read', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.body;

    const alert = await db.alert.findUnique({ where: { id } });
    if (!alert || alert.userId !== userId) {
      return res.status(404).json({ ok: false, error: 'Alert not found' });
    }

    const updated = await db.alert.update({
      where: { id },
      data: { read: true },
    });

    res.json({ ok: true, data: updated });
  } catch (error) {
    console.error('Mark alert read error:', error);
    res.status(500).json({ ok: false, error: 'Failed to mark alert as read' });
  }
});

alertsRouter.get('/summary', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;

    const [unreadCount, recentAlerts] = await Promise.all([
      db.alert.count({
        where: { userId, read: false },
      }),
      db.alert.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    res.json({
      ok: true,
      data: {
        unreadCount,
        recentAlerts,
      },
    });
  } catch (error) {
    console.error('Alert summary error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch alert summary' });
  }
});
