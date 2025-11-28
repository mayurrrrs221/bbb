import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { AuthRequest } from '../middleware/auth';

export const subscriptionsRouter = Router();

const subscriptionSchema = z.object({
  title: z.string().min(1),
  amount: z.number().positive(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  nextDate: z.string().datetime(),
  category: z.string().min(1),
  active: z.boolean().optional(),
});

subscriptionsRouter.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const subscriptions = await db.subscription.findMany({
      where: { userId },
      orderBy: { nextDate: 'asc' },
    });

    res.json({ ok: true, data: subscriptions });
  } catch (error) {
    console.error('List subscriptions error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch subscriptions' });
  }
});

subscriptionsRouter.post('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const validatedData = subscriptionSchema.parse(req.body);

    const subscription = await db.subscription.create({
      data: {
        ...validatedData,
        userId,
        nextDate: new Date(validatedData.nextDate),
        active: validatedData.active ?? true,
      },
    });

    res.json({ ok: true, data: subscription });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ ok: false, error: error.errors });
    }
    console.error('Create subscription error:', error);
    res.status(500).json({ ok: false, error: 'Failed to create subscription' });
  }
});

subscriptionsRouter.put('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;
    const validatedData = subscriptionSchema.partial().parse(req.body);

    const existing = await db.subscription.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ ok: false, error: 'Subscription not found' });
    }

    const updated = await db.subscription.update({
      where: { id },
      data: {
        ...validatedData,
        nextDate: validatedData.nextDate
          ? new Date(validatedData.nextDate)
          : undefined,
      },
    });

    res.json({ ok: true, data: updated });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ ok: false, error: 'Failed to update subscription' });
  }
});

subscriptionsRouter.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const { id } = req.params;

    const existing = await db.subscription.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) {
      return res.status(404).json({ ok: false, error: 'Subscription not found' });
    }

    await db.subscription.delete({ where: { id } });

    res.json({ ok: true, data: { id } });
  } catch (error) {
    console.error('Delete subscription error:', error);
    res.status(500).json({ ok: false, error: 'Failed to delete subscription' });
  }
});
