import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { demandAPI } from '../../services/api';
import { Zap, Search, RefreshCw, FileText } from 'lucide-react';

const SBMUnifiedTaxDemand = () => {
  const [loading, setLoading] = useState(true);
  const [demands, setDemands] = useState([]);
  const [query, setQuery] = useState('');

  const fetchUnified = async () => {
    try {
      setLoading(true);
      const res = await demandAPI.getAll({
        remarks: 'UNIFIED_DEMAND',
        limit: 50
      });
      setDemands(res.data?.data?.demands || []);
    } catch (_) {
      setDemands([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnified();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return demands;
    return demands.filter((d) => {
      const demandNo = String(d.demandNumber || '').toLowerCase();
      const propNo = String(d.property?.propertyNumber || '').toLowerCase();
      const address = String(d.property?.address || '').toLowerCase();
      const status = String(d.status || '').toLowerCase();
      return demandNo.includes(q) || propNo.includes(q) || address.includes(q) || status.includes(q);
    });
  }, [demands, query]);

  const fmtCur = (val) => '₹' + parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="ds-page-title">Unified Tax Demand (Read-only)</h1>
          <p className="ds-page-subtitle">View unified demand generations across ULBs</p>
        </div>
        <button
          type="button"
          onClick={fetchUnified}
          className="btn btn-ghost inline-flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      <div className="card">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-ds bg-primary-50 text-primary-700">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by demand no, property no, status..."
                className="input pl-9"
              />
            </div>
          </div>
          <div className="text-sm text-gray-500 whitespace-nowrap">
            {filtered.length} result(s)
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="form-section-title flex items-center">
          <span className="bg-primary-100 text-primary-700 p-2 rounded-ds mr-3">
            <Zap className="w-5 h-5" />
          </span>
          Recent Unified Generations
        </h2>

        {loading ? (
          <div className="py-10 text-center text-gray-500">Loading...</div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((d) => (
              <div key={d.id} className="stat-card card-hover group">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className="text-ds-section font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                      {d.demandNumber || '—'}
                    </span>
                    <span className="ds-page-subtitle mt-0.5">
                      FY: {d.financialYear || '—'}
                    </span>
                  </div>
                  <span
                    className={`badge capitalize ${
                      d.status === 'paid'
                        ? 'badge-success'
                        : d.status === 'partially_paid'
                          ? 'badge-warning'
                          : 'badge-danger'
                    }`}
                  >
                    {d.status || 'unknown'}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600 mb-3">
                  <FileText className="w-4 h-4 mr-2 text-gray-400 shrink-0" />
                  <span className="truncate">
                    {d.property?.propertyNumber || 'Property'} — {d.property?.address || '—'}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                  <div className="flex flex-col">
                    <span className="stat-card-title mb-0">Total Amount</span>
                    <span className="stat-card-value">{fmtCur(d.totalAmount)}</span>
                  </div>
                  <Link
                    to={`/sbm/demands/${d.id}`}
                    className="btn btn-ghost btn-sm inline-flex items-center gap-1"
                  >
                    Details <FileText className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <Zap className="empty-state-icon" />
            <p className="empty-state-text">No unified demands found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SBMUnifiedTaxDemand;

