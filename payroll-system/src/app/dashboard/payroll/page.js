'use client';

import { useState, useEffect } from 'react';

export default function PayrollPage() {
  const [payPeriodId, setPayPeriodId] = useState('');
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [disbursing, setDisbursing] = useState(false);
  
  // Modal & Receipt state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [disbursementResult, setDisbursementResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch initial payroll data
  useEffect(() => {
    fetchPayrollSummary();
  }, []);

  const fetchPayrollSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/hours');
      const json = await res.json();
      if (json.success) {
        setPayPeriodId(json.pay_period_id);
        setPayrollData(json.data || []);
      }
    } catch (err) {
      console.error('Failed to load payroll summary:', err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger the 1-Click Gateway Disbursement
  const handleDisburseAll = async () => {
    setDisbursing(true);
    setErrorMsg('');
    setDisbursementResult(null);

    try {
      const res = await fetch('/api/payroll/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pay_period_id: payPeriodId }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Disbursement failed.');
      }

      setDisbursementResult(data);
      fetchPayrollSummary(); // Refresh database status on background UI
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setDisbursing(false);
    }
  };

  const calculateTotal = () =>
    payrollData.reduce((acc, curr) => acc + (parseFloat(curr.gross_pay) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payroll Reconciliation & Payouts</h1>
          <p className="text-sm text-gray-500">
            Review calculated wages and trigger instant multi-channel disbursements.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition-all flex items-center gap-2"
          >
            <span>⚡</span>
            <span>Pay All via Gateway</span>
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Active Workers</span>
          <p className="text-2xl font-bold text-gray-800 mt-1">{payrollData.length}</p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Gross Payroll</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">
            BWP {calculateTotal().toFixed(2)}
          </p>
        </div>
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Pay Period ID</span>
          <p className="text-sm font-mono font-medium text-slate-600 mt-2 truncate">
            {payPeriodId || 'Loading...'}
          </p>
        </div>
      </div>

      {/* Disbursement Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Authorize Batch Disbursement</h3>
                <p className="text-xs text-gray-500">DPO Bank Gateway & Orange Money B2C Router</p>
              </div>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setDisbursementResult(null);
                  setErrorMsg('');
                }}
                className="text-gray-400 hover:text-gray-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* State 1: Confirmation Screen before payout */}
            {!disbursementResult && !disbursing && (
              <div className="py-6 space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-800 text-sm">
                  ⚠️ You are about to disburse funds to <strong>{payrollData.length} workers</strong> totaling{' '}
                  <strong>BWP {calculateTotal().toFixed(2)}</strong>. This will execute instant API transactions to registered bank accounts and mobile wallets.
                </div>

                {errorMsg && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                    {errorMsg}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDisburseAll}
                    className="px-5 py-2 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all"
                  >
                    Confirm & Execute Payment
                  </button>
                </div>
              </div>
            )}

            {/* State 2: Processing Spinner */}
            {disbursing && (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-medium text-gray-700">Connecting to Payment Gateways...</p>
                <p className="text-xs text-gray-400">Routing DPO EFTs and Orange Money B2C deposits</p>
              </div>
            )}

            {/* State 3: Direct Gateway Receipts */}
            {disbursementResult && (
              <div className="py-4 space-y-5">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3 text-emerald-800">
                  <span className="text-2xl">✅</span>
                  <div>
                    <h4 className="font-bold text-sm">Disbursement Completed Successfully</h4>
                    <p className="text-xs">{disbursementResult.message}</p>
                  </div>
                </div>

                {/* Receipt Table */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-900 text-white text-xs font-semibold px-4 py-2.5 flex justify-between">
                    <span>TRANSACTION RECEIPT</span>
                    <span>GATEWAY BATCH SUCCESS</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {disbursementResult.disbursements?.map((item, idx) => (
                      <div key={idx} className="p-3 text-sm flex justify-between items-center bg-gray-50/50">
                        <div>
                          <p className="font-semibold text-gray-800">{item.employee_name}</p>
                          <p className="text-xs text-gray-500">{item.channel}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-600">BWP {parseFloat(item.amount).toFixed(2)}</p>
                          <p className="text-[10px] font-mono text-gray-400">{item.reference}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => {
                      setIsModalOpen(false);
                      setDisbursementResult(null);
                    }}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}