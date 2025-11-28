import React, { useEffect, useState } from 'react';
import { dashboardApi } from '../lib/api';
import { Card, CardContent } from '../components/ui/Card'; // placeholder if needed

export default function Dashboard() {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi
      .summary()
      .then((res) => setData(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <p>Failed to load dashboard</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Balance</p>
          <p className="text-2xl font-bold text-gray-900">
            ₹{data.balance.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Income</p>
          <p className="text-2xl font-bold text-emerald-600">
            ₹{data.totalIncome.toLocaleString()}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-sm text-gray-500">Expenses</p>
          <p className="text-2xl font-bold text-rose-600">
            ₹{data.totalExpenses.toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
