import { useState, useEffect } from 'react';
import { aiApi } from '@/lib/api';
import { TrendingUp, DollarSign, PiggyBank, Target } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { toast } from 'sonner';

export default function AITwin() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedScenario, setSelectedScenario] = useState('baseline');

  useEffect(() => {
    loadTwin();
  }, []);

  const loadTwin = async () => {
    try {
      const response = await aiApi.getTwin();
      setData(response.data.data);
    } catch (error) {
      toast.error('Failed to generate AI twin simulation');
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

  const scenarios = [
    { key: 'baseline', label: 'Baseline', color: 'from-blue-500 to-cyan-600', icon: Target },
    { key: 'optimistic', label: 'Optimistic', color: 'from-green-500 to-emerald-600', icon: TrendingUp },
    { key: 'conservative', label: 'Conservative', color: 'from-yellow-500 to-orange-600', icon: PiggyBank },
    { key: 'aggressive', label: 'Aggressive', color: 'from-purple-500 to-pink-600', icon: DollarSign },
  ];

  const metrics = [
    { label: 'Monthly Income', value: `$${data?.currentMetrics?.monthlyIncome || 0}`, icon: DollarSign },
    { label: 'Monthly Expenses', value: `$${data?.currentMetrics?.monthlyExpense || 0}`, icon: TrendingUp },
    { label: 'Savings Rate', value: `${data?.currentMetrics?.savingsRate || 0}%`, icon: PiggyBank },
    { label: 'Subscriptions', value: `$${data?.currentMetrics?.subscriptionsCost || 0}`, icon: Target },
  ];

  return (
    <div className="space-y-6 p-6" data-testid="ai-twin-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">AI Financial Twin</h1>
        <p className="text-gray-600">Simulate your financial future with AI-powered predictions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div key={index} className="card animate-slide-in" style={{ animationDelay: `${index * 0.1}s` }} data-testid={`metric-card-${index}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">{metric.label}</p>
                  <p className="text-2xl font-bold text-gray-800">{metric.value}</p>
                </div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Scenario Simulations</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {scenarios.map((scenario) => {
            const Icon = scenario.icon;
            const scenarioData = data?.scenarios?.[scenario.key];
            return (
              <button
                key={scenario.key}
                onClick={() => setSelectedScenario(scenario.key)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  selectedScenario === scenario.key
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300 bg-white'
                }`}
                data-testid={`scenario-${scenario.key}`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${scenario.color} flex items-center justify-center mb-3 shadow-md`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <p className="font-semibold text-gray-800 text-left">{scenario.label}</p>
                <p className="text-sm text-gray-600 text-left mt-1">
                  Final: ${scenarioData?.finalBalance || 0}
                </p>
              </button>
            );
          })}
        </div>

        {data?.scenarios && (
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 capitalize">
              {selectedScenario} Scenario - 12 Month Projection
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data.scenarios[selectedScenario]?.months || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    padding: '12px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="balance" stroke="#6366f1" strokeWidth={3} name="Balance" />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Year-End Balance</p>
                <p className="text-2xl font-bold text-indigo-600">
                  ${data.scenarios[selectedScenario]?.finalBalance || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Avg Monthly Savings</p>
                <p className="text-2xl font-bold text-green-600">
                  $
                  {
                    Math.round(
                      (data.scenarios[selectedScenario]?.finalBalance || 0) / 12
                    )
                  }
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Growth Rate</p>
                <p className="text-2xl font-bold text-purple-600">
                  {selectedScenario === 'baseline' && '0%'}
                  {selectedScenario === 'optimistic' && '+5%'}
                  {selectedScenario === 'conservative' && '-5%'}
                  {selectedScenario === 'aggressive' && '+10%'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <h3 className="text-xl font-bold mb-3">AI Insights</h3>
        <ul className="space-y-2">
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>The aggressive scenario shows potential for {Math.round(((data?.scenarios?.aggressive?.finalBalance || 0) - (data?.scenarios?.baseline?.finalBalance || 0)) / (data?.scenarios?.baseline?.finalBalance || 1) * 100)}% more savings by year-end</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Current savings rate of {data?.currentMetrics?.savingsRate}% suggests room for optimization</span>
          </li>
          <li className="flex items-start">
            <span className="mr-2">•</span>
            <span>Consider reviewing subscriptions (${data?.currentMetrics?.subscriptionsCost}/mo) for potential savings</span>
          </li>
        </ul>
      </div>
    </div>
  );
}