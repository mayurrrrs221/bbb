import { Router } from 'express';
import { authRouter } from './routes/auth';
import { transactionsRouter } from './routes/transactions';
import { incomeRouter } from './routes/income';
import { subscriptionsRouter } from './routes/subscriptions';
import { alertsRouter } from './routes/alerts';
import { dashboardRouter } from './routes/dashboard';
import { aiRouter } from './routes/ai';
import { simRouter } from './routes/sim';
import { reportsRouter } from './routes/reports';
import { ocrRouter } from './routes/ocr';
import { authenticate } from './middleware/auth';

export const router = Router();

router.use('/auth', authRouter);
router.use('/transactions', authenticate, transactionsRouter);
router.use('/income', authenticate, incomeRouter);
router.use('/subscriptions', authenticate, subscriptionsRouter);
router.use('/alerts', authenticate, alertsRouter);
router.use('/dashboard', authenticate, dashboardRouter);
router.use('/ai', authenticate, aiRouter);
router.use('/sim', authenticate, simRouter);
router.use('/reports', authenticate, reportsRouter);
router.use('/ocr', authenticate, ocrRouter);
