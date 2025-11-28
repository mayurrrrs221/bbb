import { useState, useEffect } from 'react';
import { dashboardApi } from '@/lib/api';
import { Wallet, TrendingUp, TrendingDown, DollarSign, CreditCard, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await dashboardApi.get();
      setData(response.data.data);
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const stats = [
    {
      label: 'Balance',
      value: `$${data?.balance || 0}`,
      icon: Wallet,
      color: 'from-indigo-500 to-purple-600',
      textColor: 'text-indigo-600',
    },
    {
      label: 'Total Income',
      value: `$${data?.total_income || 0}`,
      icon: TrendingUp,
      color: 'from-green-500 to-emerald-600',
      textColor: 'text-green-600',
    },
    {
      label: 'Total Expenses',
      value: `$${data?.total_expenses || 0}`,
      icon: TrendingDown,
      color: 'from-red-500 to-pink-600',
      textColor: 'text-red-600',
    },
    {
      label: 'Subscriptions',
      value: `$${data?.monthly_subscriptions || 0}/mo`,
      icon: CreditCard,
      color: 'from-orange-500 to-yellow-600',
      textColor: 'text-orange-600',
    },
  ];

  return (
    <div className="space-y-6 p-6" data-testid="dashboard-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's your financial overview.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="card animate-slide-in"
              style={{ animationDelay: `${index * 0.1}s` }}
              data-testid={`stat-card-${stat.label.toLowerCase().replace(' ', '-')}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                  <p className={`text-2xl font-bold ${stat.textColor}`} data-testid={`stat-value-${stat.label.toLowerCase().replace(' ', '-')}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card" data-testid="category-breakdown-card">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
            <DollarSign className="w-5 h-5 mr-2 text-indigo-600" />
            Category Breakdown
          </h2>
          <div className="space-y-3">
            {data?.category_breakdown && Object.keys(data.category_breakdown).length > 0 ? (
              Object.entries(data.category_breakdown)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 5)
                .map(([category, amount], index) => {
                  const percentage = ((amount / data.total_expenses) * 100).toFixed(1);
                  return (
                    <div key={category} className="animate-slide-in" style={{ animationDelay: `${index * 0.05}s` }}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700 capitalize">{category}</span>
                        <span className="text-sm font-semibold text-gray-900">${amount.toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{percentage}% of expenses</p>
                    </div>
                  );
                })
            ) : (
              <p className="text-gray-500 text-center py-8">No expenses yet. Start tracking!</p>
            )}
          </div>
        </div>

        <div className="card" data-testid="recent-transactions-card">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Transactions</h2>
          <div className="space-y-3">
            {data?.recent_transactions && data.recent_transactions.length > 0 ? (
              data.recent_transactions.map((transaction, index) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors animate-slide-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                  data-testid={`recent-transaction-${index}`}
                >
                  <div className="flex items-center space-x-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        transaction.type === 'income'
                          ? 'bg-green-100'
                          : 'bg-red-100'
                      }`}
                    >
                      {transaction.type === 'income' ? (
                        <ArrowUpRight className="w-5 h-5 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-800 capitalize">{transaction.category}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(transaction.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold ${
                        transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'income' ? '+' : '-'}${transaction.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No transactions yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}