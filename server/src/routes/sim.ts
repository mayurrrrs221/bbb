import { Router } from 'express';
import { db } from '../db';
import { AuthRequest } from '../middleware/auth';

export const simRouter = Router();

// 10. Wealth Roadmap
simRouter.get('/wealth-roadmap', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;

    const [transactions, income] = await Promise.all([
      db.transaction.findMany({
        where: { userId, type: 'expense' },
        take: 100,
      }),
      db.income.findMany({
        where: { userId },
        take: 12,
      }),
    ]);

    const avgMonthlyExpenses =
      transactions.reduce((sum, t) => sum + t.amount, 0) / 3;
    const avgMonthlyIncome =
      income.reduce((sum, i) => sum + i.amount, 0) / income.length || 5000;
    const monthlySavings = avgMonthlyIncome - avgMonthlyExpenses;

    const roadmap = [];
    const interestRates = {
      conservative: 0.03,
      moderate: 0.07,
      aggressive: 0.12,
    };

    for (let year = 1; year <= 5; year++) {
      const baseAmount = monthlySavings * 12 * year;

      roadmap.push({
        year,
        age: new Date().getFullYear() - 1990 + year,
        conservative: Math.round(
          baseAmount * Math.pow(1 + interestRates.conservative, year)
        ),
        moderate: Math.round(
          baseAmount * Math.pow(1 + interestRates.moderate, year)
        ),
        aggressive: Math.round(
          baseAmount * Math.pow(1 + interestRates.aggressive, year)
        ),
        milestones: getMilestones(baseAmount, year),
      });
    }

    res.json({
      ok: true,
      data: {
        roadmap,
        currentSavings: Math.round(monthlySavings),
        projections: {
          year1: Math.round(monthlySavings * 12),
          year3: Math.round(monthlySavings * 12 * 3 * 1.07),
          year5: Math.round(monthlySavings * 12 * 5 * 1.15),
        },
        recommendations: [
          monthlySavings < 500 && 'Increase monthly savings to $500+',
          'Consider investing in index funds',
          'Build emergency fund (6 months expenses)',
          'Maximize retirement contributions',
        ].filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Wealth roadmap error:', error);
    res.status(500).json({ ok: false, error: 'Projection failed' });
  }
});

// 11. Goal Solver
simRouter.post('/goal-solver', async (req: AuthRequest, res) => {
  try {
    const { targetAmount, targetDate, currentSavings } = req.body;

    const now = new Date();
    const target = new Date(targetDate);
    const monthsRemaining = Math.max(
      1,
      (target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    const amountNeeded = targetAmount - (currentSavings || 0);
    const monthlyRequired = amountNeeded / monthsRemaining;
    const weeklyRequired = monthlyRequired / 4;
    const dailyRequired = monthlyRequired / 30;

    const milestones = [];
    for (let i = 1; i <= Math.min(12, monthsRemaining); i++) {
      milestones.push({
        month: i,
        targetSaved: Math.round((amountNeeded / monthsRemaining) * i),
        cumulativeTotal: Math.round(
          (currentSavings || 0) + (amountNeeded / monthsRemaining) * i
        ),
      });
    }

    res.json({
      ok: true,
      data: {
        targetAmount,
        currentSavings: currentSavings || 0,
        amountNeeded,
        monthsRemaining: Math.round(monthsRemaining),
        required: {
          monthly: Math.round(monthlyRequired),
          weekly: Math.round(weeklyRequired),
          daily: Math.round(dailyRequired * 100) / 100,
        },
        milestones,
        actionPlan: [
          `Save $${Math.round(monthlyRequired)} per month`,
          `Cut spending by $${Math.round(monthlyRequired * 0.5)} if possible`,
          `Increase income by $${Math.round(monthlyRequired * 0.5)}`,
          'Automate savings transfers',
          'Review progress monthly',
        ],
        feasibility:
          monthlyRequired > 2000
            ? 'Challenging - consider extending timeline'
            : monthlyRequired > 1000
            ? 'Achievable with discipline'
            : 'Very achievable',
      },
    });
  } catch (error) {
    console.error('Goal solver error:', error);
    res.status(500).json({ ok: false, error: 'Calculation failed' });
  }
});

// 12. Fraud Detection
simRouter.get('/fraud-check', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;

    const transactions = await db.transaction.findMany({
      where: { userId, type: 'expense' },
      orderBy: { date: 'desc' },
      take: 100,
    });

    const suspiciousTransactions: any[] = [];
    const amounts = transactions.map((t) => t.amount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(
      amounts.reduce((sum, val) => sum + Math.pow(val - avgAmount, 2), 0) /
        amounts.length
    );

    transactions.forEach((t) => {
      const reasons: string[] = [];

      if (Math.abs(t.amount - avgAmount) > stdDev * 3) {
        reasons.push('Unusual amount');
      }

      const duplicates = transactions.filter(
        (other) =>
          other.id !== t.id &&
          other.amount === t.amount &&
          other.category === t.category &&
          Math.abs(
            new Date(other.date).getTime() - new Date(t.date).getTime()
          ) < 3600000
      );
      if (duplicates.length > 0) {
        reasons.push('Possible duplicate');
      }

      if (t.amount % 100 === 0 && t.amount > 500) {
        reasons.push('Suspicious round amount');
      }

      if (reasons.length > 0) {
        suspiciousTransactions.push({
          id: t.id,
          title: t.title,
          amount: t.amount,
          date: t.date,
          reasons,
          riskLevel: reasons.length > 1 ? 'high' : 'medium',
        });
      }
    });

    res.json({
      ok: true,
      data: {
        suspiciousCount: suspiciousTransactions.length,
        transactions: suspiciousTransactions.slice(0, 10),
        riskScore: Math.min(100, suspiciousTransactions.length * 10),
        status:
          suspiciousTransactions.length === 0
            ? 'All Clear'
            : suspiciousTransactions.length < 3
            ? 'Low Risk'
            : 'Review Needed',
      },
    });
  } catch (error) {
    console.error('Fraud check error:', error);
    res.status(500).json({ ok: false, error: 'Detection failed' });
  }
});

// 13. Personality Adaptive Model
simRouter.get('/personality', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;

    const transactions = await db.transaction.findMany({
      where: { userId, type: 'expense' },
      take: 100,
    });

    const categories = new Map<string, number>();
    const timePatterns = { morning: 0, afternoon: 0, evening: 0, night: 0 };
    let impulsivePurchases = 0;

    transactions.forEach((t) => {
      categories.set(t.category, (categories.get(t.category) || 0) + 1);

      const hour = new Date(t.date).getHours();
      if (hour >= 6 && hour < 12) timePatterns.morning++;
      else if (hour >= 12 && hour < 17) timePatterns.afternoon++;
      else if (hour >= 17 && hour < 22) timePatterns.evening++;
      else timePatterns.night++;

      if (t.isRegret) impulsivePurchases++;
    });

    const topCategory = Array.from(categories.entries()).sort(
      (a, b) => b[1] - a[1]
    )[0];

    let personality = 'Balanced';
    let traits: string[] = [];

    if (impulsivePurchases > transactions.length * 0.2) {
      personality = 'Impulsive Spender';
      traits = [
        'Acts on emotion',
        'Enjoys instant gratification',
        'May benefit from waiting periods',
      ];
    } else if ((categories.get('Food') || 0) > transactions.length * 0.4) {
      personality = 'Food Enthusiast';
      traits = [
        'Values experiences',
        'Social spender',
        'Could meal prep to save',
      ];
    } else if ((categories.get('Shopping') || 0) > transactions.length * 0.3) {
      personality = 'Retail Therapy';
      traits = [
        'Shopping as stress relief',
        'Brand conscious',
        'Consider alternatives',
      ];
    } else if (timePatterns.night > transactions.length * 0.3) {
      personality = 'Night Owl Spender';
      traits = [
        'Late-night purchases',
        'Vulnerable to marketing',
        'Set app timers',
      ];
    } else {
      personality = 'Mindful Spender';
      traits = [
        'Deliberate purchases',
        'Good impulse control',
        'Keep up the good habits',
      ];
    }

    res.json({
      ok: true,
      data: {
        personality,
        traits,
        spendingPattern: {
          topCategory: topCategory?.[0] || 'None',
          preferredTime: Object.entries(timePatterns).sort(
            (a, b) => b[1] - a[1]
          )[0][0],
          impulsiveRate: Math.round(
            (impulsivePurchases / (transactions.length || 1)) * 100
          ),
        },
        recommendations: [
          `Your ${personality} style suggests focusing on ${
            personality === 'Impulsive Spender'
              ? 'waiting 24 hours before purchases'
              : personality === 'Food Enthusiast'
              ? 'meal planning and home cooking'
              : 'your current balanced approach'
          }`,
        ],
      },
    });
  } catch (error) {
    console.error('Personality analysis error:', error);
    res.status(500).json({ ok: false, error: 'Analysis failed' });
  }
});

// 14. Time Value Tracker
simRouter.post('/time-value', async (req: AuthRequest, res) => {
  try {
    const { hourlyRate, purchaseAmount } = req.body;

    const hoursOfWork = purchaseAmount / hourlyRate;
    const daysOfWork = hoursOfWork / 8;
    const weeksOfWork = daysOfWork / 5;

    res.json({
      ok: true,
      data: {
        purchaseAmount,
        hourlyRate,
        equivalentWork: {
          hours: Math.round(hoursOfWork * 100) / 100,
          days: Math.round(daysOfWork * 100) / 100,
          weeks: Math.round(weeksOfWork * 100) / 100,
        },
        perspective:
          hoursOfWork > 40
            ? 'This costs more than a week of work'
            : hoursOfWork > 8
            ? 'This costs more than a day of work'
            : hoursOfWork > 1
            ? 'This costs several hours of work'
            : 'This is less than an hour of work',
        recommendation:
          hoursOfWork > 20
            ? 'Consider if this purchase is worth the time investment'
            : 'Reasonable purchase relative to your income',
      },
    });
  } catch (error) {
    console.error('Time value error:', error);
    res.status(500).json({ ok: false, error: 'Calculation failed' });
  }
});

// 15. Regret Tracker
simRouter.get('/regrets', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;

    const regretPurchases = await db.transaction.findMany({
      where: { userId, type: 'expense', isRegret: true },
      orderBy: { date: 'desc' },
    });

    const totalRegretAmount = regretPurchases.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    const categoryRegrets = new Map<string, number>();

    regretPurchases.forEach((t) => {
      categoryRegrets.set(
        t.category,
        (categoryRegrets.get(t.category) || 0) + t.amount
      );
    });

    const topRegretCategories = Array.from(categoryRegrets.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount),
        count: regretPurchases.filter((t) => t.category === category).length,
      }));

    res.json({
      ok: true,
      data: {
        totalRegrets: regretPurchases.length,
        totalAmount: Math.round(totalRegretAmount),
        monthlyAvg: Math.round(totalRegretAmount / 3),
        topCategories: topRegretCategories,
        recentRegrets: regretPurchases.slice(0, 5),
        insights: [
          totalRegretAmount > 500 &&
            `You've spent $${Math.round(totalRegretAmount)} on regret purchases`,
          topRegretCategories.length > 0 &&
            `Avoid impulse buys in ${topRegretCategories[0].category}`,
          'Consider implementing a 24-hour waiting period',
        ].filter(Boolean),
      },
    });
  } catch (error) {
    console.error('Regret tracker error:', error);
    res.status(500).json({ ok: false, error: 'Analysis failed' });
  }
});

// Helpers
function getMilestones(amount: number, year: number) {
  const milestones: string[] = [];

  if (amount * year >= 10000) milestones.push('Emergency fund complete');
  if (amount * year >= 50000) milestones.push('Down payment ready');
  if (amount * year >= 100000) milestones.push('Six-figure milestone');
  if (amount * year >= 250000) milestones.push('Quarter million achieved');

  return milestones;
}
