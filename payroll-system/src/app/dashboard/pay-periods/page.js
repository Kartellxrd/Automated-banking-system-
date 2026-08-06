'use client';

import { useState, useEffect } from 'react';

export default function PayPeriodsPage() {
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ period_name: '', start_date: '', end_date: '' });
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchPeriods();
  }, []);

  const fetchPeriods = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/pay-periods');
      const data = await res.json();
      if (data.success) {
        setPeriods(data.periods);
      }
    } catch (err) {
      console.error('Failed to load pay periods:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMsg({ text: '', type: '' });

    try {
      const res = await fetch('/api/pay-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create period');

      setMsg({ text: 'New payroll cycle activated!', type: 'success' });
      setForm({ period_name: '', start_date: '', end_date: '' });
      fetchPeriods();
    } catch (err) {
      setMsg({ text: err.message, type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClosePeriod = async (id) => {
    if (!confirm('Are you sure you want to close this pay period? No new logbook entries can be added to closed periods.')) return;

    try {
      const res = await fetch('/api/pay-periods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CLOSE', period_id: id }),
      });
      const data = await res.json();

      if (data.success) {
        fetchPeriods();
      }
    } catch (err) {
      alert('Failed to close pay period');
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pay Period & Cycle Management</h1>
        <p className="text-sm text-gray-500">
          Define payroll cycles, open new work weeks, and lock historical periods.
        </p>
      </div>

      {/* New Cycle Form */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">Open New Pay Cycle</h2>

        {msg.text && (
          <div
            className={`p-3 text-sm rounded-lg ${
              msg.type === 'success' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
            }`}
          >
            {msg.text}
          </div>
        )}

        <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
              Cycle Name
            </label>
            <input
              type="text"
              placeholder="e.g., Aug 2026 - Week 1"
              value={form.period_name}
              onChange={(e) => setForm({ ...form, period_name: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">
              End Date
            </label>
            <input
              type="date"
              value={form.end_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-all disabled:opacity-50"
          >
            {submitting ? 'Activating...' : '+ Start New Cycle'}
          </button>
        </form>
      </div>

      {/* Pay Periods Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
          <h2 className="font-semibold text-gray-800">Payroll Cycle History</h2>
          <span className="text-xs text-gray-400">{periods.length} cycles recorded</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-gray-500">Loading cycles...</div>
        ) : periods.length === 0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No payroll cycles found. Create one above to get started.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {periods.map((p) => (
              <div key={p.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900">{p.period_name}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        p.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {p.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {p.start_date} to {p.end_date}
                  </p>
                </div>

                <div>
                  {p.status === 'Active' && (
                    <button
                      onClick={() => handleClosePeriod(p.id)}
                      className="text-xs px-3 py-1.5 border border-amber-300 bg-amber-50 text-amber-800 rounded-lg hover:bg-amber-100 font-medium transition-colors"
                    >
                      🔒 Lock & Close Cycle
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}