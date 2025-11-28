import { useState, useEffect } from 'react';
import { subscriptionApi } from '@/lib/api';
import { Plus, Trash2, CreditCard, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    billing_cycle: 'monthly',
    next_billing_date: '',
  });

  useEffect(() => {
    loadSubscriptions();
  }, []);

  const loadSubscriptions = async () => {
    try {
      const response = await subscriptionApi.getAll();
      setSubscriptions(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load subscriptions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await subscriptionApi.create({
        ...formData,
        amount: parseFloat(formData.amount),
        next_billing_date: new Date(formData.next_billing_date).toISOString(),
      });
      toast.success('Subscription added!');
      setShowModal(false);
      setFormData({ name: '', amount: '', billing_cycle: 'monthly', next_billing_date: '' });
      loadSubscriptions();
    } catch (error) {
      toast.error('Failed to add subscription');
    }
  };

  const handleCancel = async (id) => {
    try {
      await subscriptionApi.delete(id);
      toast.success('Subscription cancelled');
      loadSubscriptions();
    } catch (error) {
      toast.error('Failed to cancel subscription');
    }
  };

  const totalMonthly = subscriptions.reduce((sum, sub) => {
    if (sub.billing_cycle === 'monthly') return sum + sub.amount;
    if (sub.billing_cycle === 'yearly') return sum + sub.amount / 12;
    if (sub.billing_cycle === 'weekly') return sum + (sub.amount * 52) / 12;
    return sum;
  }, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6" data-testid="subscriptions-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Subscriptions</h1>
          <p className="text-gray-600">Manage your recurring payments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary" data-testid="add-subscription-button">
          <Plus className="w-5 h-5 inline mr-2" />
          Add Subscription
        </button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between p-6 bg-gradient-to-br from-orange-500 to-yellow-600 rounded-xl text-white mb-6">
          <div>
            <p className="text-sm opacity-90 mb-1">Total Monthly Cost</p>
            <p className="text-4xl font-bold" data-testid="total-monthly-cost">${totalMonthly.toFixed(2)}</p>
          </div>
          <CreditCard className="w-16 h-16 opacity-80" />
        </div>

        <div className="space-y-3">
          {subscriptions.length > 0 ? (
            subscriptions.map((sub, index) => (
              <div
                key={sub.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all animate-slide-in"
                style={{ animationDelay: `${index * 0.05}s` }}
                data-testid={`subscription-item-${index}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-yellow-600 flex items-center justify-center shadow-lg">
                    <CreditCard className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{sub.name}</p>
                    <div className="flex items-center space-x-3 mt-1">
                      <p className="text-sm text-gray-500 capitalize">{sub.billing_cycle}</p>
                      <span className="text-gray-300">•</span>
                      <p className="text-sm text-gray-500 flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        Next: {new Date(sub.next_billing_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <p className="text-xl font-bold text-orange-600">${sub.amount.toFixed(2)}</p>
                  <button
                    onClick={() => handleCancel(sub.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    data-testid={`cancel-subscription-${index}`}
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">No subscriptions yet</p>
              <button onClick={() => setShowModal(true)} className="btn-primary">
                Add Your First Subscription
              </button>
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in" data-testid="subscription-modal">
          <div className="card max-w-md w-full animate-slide-in">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Subscription</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Service Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Netflix, Spotify"
                  required
                  data-testid="subscription-name-input"
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
                  data-testid="subscription-amount-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Billing Cycle</label>
                <select
                  value={formData.billing_cycle}
                  onChange={(e) => setFormData({ ...formData, billing_cycle: e.target.value })}
                  data-testid="subscription-cycle-select"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Next Billing Date</label>
                <input
                  type="date"
                  value={formData.next_billing_date}
                  onChange={(e) => setFormData({ ...formData, next_billing_date: e.target.value })}
                  required
                  data-testid="subscription-date-input"
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button type="submit" className="btn-primary flex-1" data-testid="subscription-submit-button">
                  Add Subscription
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                  data-testid="subscription-cancel-button"
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