import { Router } from 'express';
import OpenAI from 'openai';
import { z } from 'zod';
import { db } from '../db';
import { AuthRequest } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { logger } from '../utils/logger';

export const aiRouter = Router();

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

const chatSchema = z.object({
  message: z.string().min(1).max(2000),
  conversationId: z.string().optional(),
});

aiRouter.post(
  '/chat',
  validateRequest(chatSchema),
  async (req: AuthRequest, res) => {
    try {
      const userId = req.user!.uid;
      const { message, conversationId } = req.body;
      const sanitizedMessage = message.trim().slice(0, 2000);

      let conversation = conversationId
        ? await db.conversation.findFirst({
            where: { id: conversationId, userId },
          })
        : null;

      const messages: any[] = conversation ? ((conversation as any).messages as any[]) : [];

      messages.push({
        role: 'user',
        content: sanitizedMessage,
        timestamp: new Date().toISOString(),
      });

      const recentTransactions = await db.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 10,
      });

      const contextSummary = `User's recent transactions: ${recentTransactions
        .map(
          (t) =>
            `${t.type} of ${t.amount} in ${t.category} on ${t.date.toISOString().split('T')[0]}`
        )
        .join('; ')}`;

      let assistantReply = '';

      if (openai) {
        try {
          const completion = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [
              {
                role: 'system',
                content:
                  'You are a helpful personal finance assistant for the Finote app. You help users manage their finances, understand their spending patterns, and make better financial decisions. Be concise, supportive, and actionable. ' +
                  contextSummary,
              },
              ...messages.slice(-10).map((m: any) => ({
                role: m.role,
                content: m.content,
              })),
            ],
            max_tokens: 500,
            temperature: 0.7,
          });

          assistantReply =
            completion.choices[0]?.message?.content ||
            'I apologize, I could not generate a response.';
        } catch (error) {
          logger.error('OpenAI API error:', error);
          assistantReply =
            "I'm having trouble connecting to my AI brain right now. Please try again in a moment.";
        }
      } else {
        assistantReply = simulateAIResponse(sanitizedMessage, recentTransactions as any[]);
      }

      messages.push({
        role: 'assistant',
        content: assistantReply,
        timestamp: new Date().toISOString(),
      });

      const updatedConversation = conversationId
        ? await db.conversation.update({
            where: { id: conversationId },
            data: { messages, updatedAt: new Date() },
          })
        : await db.conversation.create({
            data: {
              userId,
              messages,
              title: sanitizedMessage.slice(0, 50),
            },
          });

      res.json({
        ok: true,
        data: {
          reply: assistantReply,
          conversationId: updatedConversation.id,
          isSimulated: !openai,
        },
      });
    } catch (error) {
      logger.error('AI chat error:', error);
      res.status(500).json({ ok: false, error: 'Failed to process chat' });
    }
  }
);

aiRouter.post('/twin', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.uid;

    const [transactions, incomes, subscriptions] = await Promise.all([
      db.transaction.findMany({
        where: {
          userId,
          date: { gte: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        },
        orderBy: { date: 'desc' },
      }),
      db.income.findMany({ where: { userId } }),
      db.subscription.findMany({ where: { userId, active: true } }),
    ]);

    const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    const totalSubscriptions = subscriptions.reduce((sum, s) => sum + s.amount, 0);

    const avgMonthlyExpense = totalExpenses / 3;
    const savingsRate =
      totalIncome > 0 ? ((totalIncome - avgMonthlyExpense) / totalIncome) * 100 : 0;

    const scenarios = {
      baseline: generateScenario(totalIncome, avgMonthlyExpense, savingsRate, 0),
      optimistic: generateScenario(totalIncome, avgMonthlyExpense, savingsRate + 10, 1.05),
      conservative: generateScenario(totalIncome, avgMonthlyExpense, savingsRate - 5, 0.95),
      aggressive: generateScenario(totalIncome, avgMonthlyExpense, savingsRate + 20, 1.1),
    };

    res.json({
      ok: true,
      data: {
        currentMetrics: {
          monthlyIncome: totalIncome,
          monthlyExpense: avgMonthlyExpense,
          savingsRate: Math.round(savingsRate * 10) / 10,
          subscriptionsCost: totalSubscriptions,
        },
        scenarios,
      },
    });
  } catch (error) {
    logger.error('Twin simulation error:', error);
    res.status(500).json({ ok: false, error: 'Failed to generate twin simulation' });
  }
});

function simulateAIResponse(message: string, transactions: any[]): string {
  const lower = message.toLowerCase();

  if (lower.includes('spend') || lower.includes('expense')) {
    const totalExpenses = transactions
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    return `Based on your recent activity, you've spent ${totalExpenses.toFixed(
      2
    )} across ${transactions.length} transactions. Your top category is ${
      transactions[0]?.category || 'N/A'
    }. Consider setting a budget to track this better!`;
  }

  if (lower.includes('save') || lower.includes('saving')) {
    return 'Great question! I recommend following the 50/30/20 rule: 50% for needs, 30% for wants, and 20% for savings. Based on your patterns, you could potentially save more by reducing discretionary spending.';
  }

  if (lower.includes('budget')) {
    return "Let's create a budget! I've analyzed your spending and suggest allocating specific amounts to each category. Would you like me to help you set up category-based limits?";
  }

  return "I'm here to help you with your finances! You can ask me about your spending patterns, savings goals, budgeting advice, or any financial questions. What would you like to know?";
}

function generateScenario(
  income: number,
  expense: number,
  savingsRate: number,
  growthFactor: number
) {
  const months = [];
  let balance = 0;

  for (let i = 1; i <= 12; i++) {
    const monthlyIncome = income * (growthFactor || 1);
    const monthlySaving = (monthlyIncome * savingsRate) / 100;
    balance += monthlySaving;

    months.push({
      month: i,
      income: Math.round(monthlyIncome),
      expenses: Math.round(expense),
      savings: Math.round(monthlySaving),
      balance: Math.round(balance),
    });
  }

  return { months, finalBalance: Math.round(balance) };
}
