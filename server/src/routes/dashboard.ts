import { Router } from 'express';
import { db } from '../db';
import { AuthRequest } from '../middleware/auth';

export const dashboardRouter = Router();

dashboardRouter.get('/summary', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const { period = 'month' } = req.query;

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const [transactions, incomes, subscriptions, goals, alerts] = await Promise.all([
      db.transaction.findMany({
        where: { userId, date: { gte: startDate } },
        orderBy: { date: 'desc' },
      }),
      db.income.findMany({
        where: { userId, date: { gte: startDate } },
      }),
      db.subscription.findMany({
        where: { userId, active: true },
      }),
      db.goal.findMany({
        where: { userId, status: 'active' },
        orderBy: { targetDate: 'asc' },
      }),
      db.alert.findMany({
        where: { userId, read: false },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    const expenses = transactions.filter((t) => t.type === 'expense');
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const balance = totalIncome - totalExpenses;
    const savingsRate =
      totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;

    const categoryMap = new Map<string, number>();
    expenses.forEach((t) => {
      const current = categoryMap.get(t.category) || 0;
      categoryMap.set(t.category, current + t.amount);
    });

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
        percentage: totalExpenses ? (amount / totalExpenses) * 100 : 0,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    const monthlyTrend = await generateMonthlyTrend(userId);

    const summary = {
      balance: Math.round(balance * 100) / 100,
      totalIncome: Math.round(totalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      savingsRate: Math.round(savingsRate * 10) / 10,
      categoryBreakdown,
      monthlyTrend,
      recentTransactions: transactions.slice(0, 10),
      goals: goals.slice(0, 5),
      alerts,
      subscriptionsCost: subscriptions.reduce((sum, s) => sum + s.amount, 0),
    };

    res.json({ ok: true, data: summary });
  } catch (error) {
    console.error('Dashboard summary error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch dashboard summary' });
  }
});

dashboardRouter.get('/category-summary', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;
    const { period = 'month', category } = req.query;

    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    const where: any = {
      userId,
      type: 'expense',
      date: { gte: startDate },
    };

    if (category) {
      where.category = category;
    }

    const transactions = await db.transaction.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    const total = transactions.reduce((sum, t) => sum + t.amount, 0);
    const average = transactions.length > 0 ? total / transactions.length : 0;

    const dailySpending = new Map<string, number>();
    transactions.forEach((t) => {
      const day = t.date.toISOString().split('T')[0];
      const current = dailySpending.get(day) || 0;
      dailySpending.set(day, current + t.amount);
    });

    const dailyTrend = Array.from(dailySpending.entries())
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({
      ok: true,
      data: {
        total: Math.round(total * 100) / 100,
        average: Math.round(average * 100) / 100,
        count: transactions.length,
        dailyTrend,
        transactions: transactions.slice(0, 20),
      },
    });
  } catch (error) {
    console.error('Category summary error:', error);
    res.status(500).json({ ok: false, error: 'Failed to fetch category summary' });
  }
});

async function generateMonthlyTrend(userId: string) {
  const months = [];
  const now = new Date();

  for (let i = 5; i >= 0; i--) {
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    const [expenses, incomes] = await Promise.all([
      db.transaction.aggregate({
        where: {
          userId,
          type: 'expense',
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
      db.income.aggregate({
        where: {
          userId,
          date: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
    ]);

    months.push({
      month: monthStart.toLocaleDateString('en-US', { month: 'short' }),
      income: Math.round((incomes._sum.amount || 0) * 100) / 100,
      expenses: Math.round((expenses._sum.amount || 0) * 100) / 100,
    });
  }

  return months;
}
