import React, { useEffect, useState } from 'react';
import { transactionsApi } from '../lib/api';

export default function Transactions() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    transactionsApi
      .list()
      .then((res) => setTransactions(res.data.data.transactions || res.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Transactions</h1>
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500">
                  Date
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">
                  Title
                </th>
                <th className="px-4 py-2 text-left font-medium text-gray-500">
                  Category
                </th>
                <th className="px-4 py-2 text-right font-medium text-gray-500">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {transactions.map((t) => (
                <tr key={t.id}>
                  <td className="px-4 py-2">
                    {new Date(t.date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-2">{t.title}</td>
                  <td className="px-4 py-2">{t.category}</td>
                  <td
                    className={`px-4 py-2 text-right ${
                      t.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'
                    }`}
                  >
                    {t.type === 'expense' ? '-' : '+'}₹
                    {t.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
              {transactions.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-6 text-center text-gray-500 text-sm"
                  >
                    No transactions yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
