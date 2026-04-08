import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { paymentAPI } from '../../services/api';
import { exportToCSV } from '../../utils/exportCSV';
import { Banknote, Download, RefreshCw, Search, FileDown, Receipt, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import ReceiptModal from '../../components/ReceiptModal';

const SBMPayments = () => {
  const location = useLocation();
  const sp = new URLSearchParams(location.search || '');
  const moduleFromUrl = (sp.get('module') || '').toUpperCase();
  const [payments, setPayments] = useState([]);
  const [ulbs, setUlbs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ulbId, setUlbId] = useState('');

  const [selectedPayment, setSelectedPayment] = useState(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const handleViewReceipt = (payment) => {
    setSelectedPayment(payment);
    setIsReceiptModalOpen(true);
  };

  useEffect(() => {
    api.get('/admin-management/ulbs').then((res) => {
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setUlbs(data);
    }).catch(() => {});
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {
        limit: 5000,
        search: search.trim() || undefined,
        ulb_id: ulbId || undefined
      };
      const res = await paymentAPI.getAll(params);
      const list = res.data?.data?.payments ?? [];
      setPayments(Array.isArray(list) ? list : []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load payments');
      setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [ulbId]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchData();
  };

  const handleExport = () => {
    const rows = payments.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      amount: p.amount,
      mode: p.mode,
      status: p.status,
      demandId: p.demand_id ?? p.demandId,
      paidAt: p.paidAt ?? p.created_at
    }));
    exportToCSV(rows, `sbm_payments_${new Date().toISOString().slice(0, 10)}`);
    toast.success('CSV downloaded');
  };

  return (
    <div className="space-y-4">
      <h1 className="print-only text-xl font-bold text-gray-900 mb-2">Payments</h1>
      <div className="no-print">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Banknote className="w-7 h-7 text-violet-600" />
          Payments (Read-only)
        </h1>
        <p className="text-gray-600 text-sm">View all payments across ULBs. Filter by ULB, search by receipt/ID, export CSV.</p>
      </div>

      <div className="no-print flex flex-wrap gap-3 items-end">
        <select value={ulbId} onChange={(e) => setUlbId(e.target.value)} className="input w-auto min-w-[180px]">
          <option value="">All ULBs</option>
          {ulbs.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <form onSubmit={handleSearch} className="flex gap-2 flex-1 min-w-0 max-w-md">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by receipt number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pl-9 w-full"
            />
          </div>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>
        <button type="button" onClick={fetchData} className="btn btn-secondary flex items-center gap-2" disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
        <button type="button" onClick={handleExport} className="btn btn-secondary flex items-center gap-2" disabled={!payments.length}>
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        <button type="button" onClick={() => window.print()} className="btn btn-secondary flex items-center gap-2">
          <FileDown className="w-4 h-4" />
          Print / PDF
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        {loading && !payments.length ? (
          <div className="p-8 flex justify-center">
            <RefreshCw className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Receipt #</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Demand ID</th>
                  <th className="print-hide-col px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.receiptNumber}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.amount != null ? Number(p.amount).toFixed(2) : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.mode || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.status || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{p.demand_id ?? p.demandId ?? '—'}</td>
                    <td className="print-hide-col px-4 py-3">
                      <div className="flex items-center space-x-3 text-sm">
                        <Link
                          to={`/sbm/payments/${p.id}${moduleFromUrl ? `?module=${encodeURIComponent(moduleFromUrl)}` : ''}`}
                          className="text-gray-600 hover:text-violet-600 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleViewReceipt(p)}
                          className="text-violet-600 hover:text-violet-800 transition-colors"
                          title="View Receipt"
                        >
                          <Receipt className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !payments.length && (
          <div className="p-8 text-center text-gray-500">No payments found.</div>
        )}
      </div>

      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        data={selectedPayment}
        type="PAYMENT"
      />
    </div>
  );
};

export default SBMPayments;
