import { useState, useEffect } from 'react';
import { incomeApi } from '@/lib/api';
import { Plus, Trash2, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

export default function Income() {
  const [incomes, setIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    source: '',
    amount: '',
    frequency: 'monthly',
    next_date: '',
  });

  useEffect(() => {
    loadIncomes();
  }, []);

  const loadIncomes = async () => {
    try {
      const response = await incomeApi.getAll();
      setIncomes(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load income sources');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await incomeApi.create({
        ...formData,
        amount: parseFloat(formData.amount),
        next_date: formData.next_date ? new Date(formData.next_date).toISOString() : null,
      });
      toast.success('Income source added!');
      setShowModal(false);
      setFormData({ source: '', amount: '', frequency: 'monthly', next_date: '' });
      loadIncomes();
    } catch (error) {
      toast.error('Failed to add income source');
    }
  };

  const handleDelete = async (id) => {
    try {
      await incomeApi.delete(id);
      toast.success('Income source deleted');
      loadIncomes();
    } catch (error) {
      toast.error('Failed to delete income source');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="income-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Income Sources</h1>
          <p className="text-gray-600">Manage your income streams</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary" data-testid="add-income-button">
          <Plus className="w-5 h-5 inline mr-2" />
          Add Income
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {incomes.length > 0 ? (
          incomes.map((income, index) => (
            <div
              key={income.id}
              className="card animate-slide-in"
              style={{ animationDelay: `${index * 0.1}s` }}
              data-testid={`income-card-${index}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <button
                  onClick={() => handleDelete(income.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  data-testid={`delete-income-${index}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <h3 className="text-lg font-semibold text-gray-800 mb-2">{income.source}</h3>
              <p className="text-2xl font-bold text-green-600 mb-2">${income.amount.toFixed(2)}</p>
              <p className="text-sm text-gray-500 capitalize">{income.frequency}</p>
              {income.next_date && (
                <p className="text-xs text-gray-400 mt-2">
                  Next: {new Date(income.next_date).toLocaleDateString()}
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 card">
            <p className="text-gray-500 mb-4">No income sources yet</p>
            <button onClick={() => setShowModal(true)} className="btn-primary">
              Add Your First Income Source
            </button>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in" data-testid="income-modal">
          <div className="card max-w-md w-full animate-slide-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Income Source</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Source</label>
                <input
                  type="text"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  placeholder="e.g., Salary, Freelance"
                  required
                  data-testid="income-source-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                  required
                  data-testid="income-amount-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                <select
                  value={formData.frequency}
                  onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                  data-testid="income-frequency-select"
                >
                  <option value="monthly">Monthly</option>
                  <option value="weekly">Weekly</option>
                  <option value="yearly">Yearly</option>
                  <option value="one-time">One-time</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Next Payment Date (Optional)</label>
                <input
                  type="date"
                  value={formData.next_date}
                  onChange={(e) => setFormData({ ...formData, next_date: e.target.value })}
                  data-testid="income-next-date-input"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn-primary flex-1" data-testid="income-submit-button">
                  Add Income
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                  data-testid="income-cancel-button"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}