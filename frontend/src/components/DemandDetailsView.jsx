import { Link } from 'react-router-dom';
import { Receipt, CreditCard, TrendingUp, Calendar, Wallet, Banknote, Home } from 'lucide-react';

const formatAmount = (n) =>
  `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const serviceTypeLabel = (type) => {
  if (!type) return 'Demand';
  const t = type.replace('_', ' ');
  return t === 'HOUSE TAX' ? 'House Tax' : t === 'WATER TAX' ? 'Water Tax' : t === 'SHOP TAX' ? 'Shop Tax' : type;
};

const serviceTypeBadgeClass = (type) => {
  if (type === 'D2DC') return 'bg-green-100 text-green-800 border-green-300';
  if (type === 'WATER_TAX') return 'bg-cyan-100 text-cyan-800 border-cyan-300';
  if (type === 'SHOP_TAX') return 'bg-amber-100 text-amber-800 border-amber-300';
  return 'bg-blue-100 text-blue-800 border-blue-300';
};

const statusBadgeClass = (status) => {
  const s = (status || '').toLowerCase();
  if (s === 'paid') return 'badge-success';
  if (s === 'pending' || s === 'partially_paid') return 'badge-warning';
  if (s === 'overdue') return 'badge-danger';
  return 'badge-info';
};

/**
 * Shared Tax Demand Details UI – used by Citizen, Admin/Clerk, and Collector.
 * Renders: back link, title, actions, summary strip, demand info card, payment history card, property card, and optional children (discount, breakdown, remarks).
 */
export default function DemandDetailsView({
  demand,
  backTo,
  backLabel = 'Back to Tax Demands',
  title = 'Tax Demand Details',
  actionButtons,
  propertyNumberLink,
  assessmentLink,
  children,
}) {
  if (!demand) return null;

  const dueDate = demand.dueDate ? new Date(demand.dueDate) : null;
  const isOverdue = dueDate && dueDate.getTime && !isNaN(dueDate.getTime()) && dueDate < new Date() && parseFloat(demand.balanceAmount || 0) > 0;
  const payments = Array.isArray(demand.payments) ? demand.payments : [];
  const property = demand.property;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="ds-page-header flex-wrap gap-4">
        <div>
          <h1 className="ds-page-title">{title}</h1>
          <p className="ds-page-subtitle">
            {demand.demandNumber}
            {demand.serviceType && (
              <span className={`ml-2 px-2 py-0.5 text-xs font-semibold rounded border ${serviceTypeBadgeClass(demand.serviceType)}`}>
                {serviceTypeLabel(demand.serviceType)}
              </span>
            )}
          </p>
        </div>
        {actionButtons && <div className="flex items-center gap-2 flex-wrap">{actionButtons}</div>}
      </div>

      {/* Summary – stat cards matching global dashboard UI */}
      <section>
        <h2 className="form-section-title flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
          Summary
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-card-title">
              <span>Status</span>
            </div>
            <p className="stat-card-value text-base">
              <span className={`badge capitalize ${statusBadgeClass(demand.status)}`}>
                {(demand.status || '').replace('_', ' ')}
              </span>
            </p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title">
              <span>Balance</span>
              <Wallet className="w-5 h-5 text-gray-400" />
            </div>
            <p className={`stat-card-value text-xl font-bold ${parseFloat(demand.balanceAmount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {formatAmount(demand.balanceAmount)}
            </p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title">
              <span>Due Date</span>
              <Calendar className="w-5 h-5 text-gray-400" />
            </div>
            <p className={`stat-card-value text-lg font-bold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
              {demand.dueDate ? new Date(demand.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'}
              {isOverdue && <span className="block text-xs font-normal text-red-600 mt-0.5">Overdue</span>}
            </p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title">
              <span>Total / Paid</span>
              <Banknote className="w-5 h-5 text-gray-400" />
            </div>
            <p className="stat-card-value text-base">
              <span className="text-gray-900 font-bold">{formatAmount(demand.totalAmount)}</span>
              <span className="text-gray-400 mx-1">/</span>
              <span className="text-green-600 font-bold">{formatAmount(demand.paidAmount)}</span>
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Demand information */}
        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-primary-600" />
            Demand Information
          </h2>
          <dl className="divide-y divide-gray-100">
            <DetailRow label="Financial Year" value={demand.financialYear} />
            <DetailRow label="Base Amount" value={formatAmount(demand.baseAmount)} />
            {parseFloat(demand.arrearsAmount || 0) > 0 && (
              <DetailRow label="Arrears" value={formatAmount(demand.arrearsAmount)} valueClass="text-orange-600 font-semibold" />
            )}
            {parseFloat(demand.penaltyAmount || 0) > 0 && (
              <DetailRow label="Penalty" value={formatAmount(demand.penaltyAmount)} valueClass="text-red-600" />
            )}
            {parseFloat(demand.interestAmount || 0) > 0 && (
              <DetailRow label="Interest" value={formatAmount(demand.interestAmount)} valueClass="text-red-600" />
            )}
            <DetailRow label="Total Amount" value={formatAmount(demand.totalAmount)} valueClass="font-bold text-gray-900" />
            <DetailRow label="Paid Amount" value={formatAmount(demand.paidAmount)} valueClass="text-green-600 font-semibold" />
            <DetailRow
              label="Balance"
              value={formatAmount(demand.balanceAmount)}
              valueClass={parseFloat(demand.balanceAmount || 0) > 0 ? 'text-red-600 font-bold' : 'text-green-600 font-semibold'}
            />
            {demand.assessment && (
              <DetailRow
                label="Assessment"
                value={assessmentLink ? <Link to={assessmentLink} className="text-primary-600 hover:underline">{demand.assessment.assessmentNumber}</Link> : demand.assessment.assessmentNumber}
              />
            )}
            {demand.generatedDate && (
              <DetailRow label="Generated" value={new Date(demand.generatedDate).toLocaleDateString()} />
            )}
            {demand.generatedBy && (
              <DetailRow label="Generated By" value={`User ID: ${demand.generatedBy}`} />
            )}
          </dl>
        </div>

        {/* Payment history */}
        <div className="card">
          <h2 className="form-section-title flex items-center">
            <CreditCard className="w-5 h-5 mr-2 text-primary-600" />
            Payment History
          </h2>
          <div>
            {payments.length === 0 ? (
              <p className="text-gray-500 text-sm">No payments recorded</p>
            ) : (
              <div className="space-y-4">
                {payments.map((p) => (
                  <div key={p.id} className="flex justify-between items-start gap-4 py-3 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{p.receiptNumber}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {new Date(p.paymentDate).toLocaleDateString()} · {(p.paymentMode || '').toLowerCase()}
                      </p>
                      {p.cashier && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {p.cashier.firstName} {p.cashier.lastName}
                        </p>
                      )}
                    </div>
                    <span className="text-green-600 font-semibold shrink-0">{formatAmount(p.amount)}</span>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200 font-semibold">
                  <span className="text-gray-700">Total Paid</span>
                  <span className="text-green-600">{formatAmount(demand.paidAmount)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property */}
      {property && (
        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Home className="w-5 h-5 mr-2 text-primary-600" />
            Property & Owner
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailRow
              label="Property Number"
              value={propertyNumberLink ? <Link to={propertyNumberLink} className="text-primary-600 hover:underline">{property.propertyNumber}</Link> : property.propertyNumber}
            />
            <DetailRow label="Ward" value={property.ward?.wardName} />
            <div className="sm:col-span-2">
              <DetailRow label="Address" value={property.address || '—'} />
            </div>
            {property.owner && (
              <>
                <DetailRow
                  label="Owner"
                  value={[property.owner.firstName, property.owner.lastName].filter(Boolean).join(' ') || property.ownerName || '—'}
                />
                {property.owner.email && (
                  <DetailRow label="Owner Email" value={property.owner.email} />
                )}
                {property.owner.phone && (
                  <DetailRow label="Owner Phone" value={property.owner.phone} />
                )}
              </>
            )}
          </div>
        </div>
      )}

      {children}
    </div>
  );
}

function DetailRow({ label, value, valueClass = '' }) {
  if (value == null || value === '') return null;
  return (
    <div className="py-3 flex justify-between items-baseline gap-4">
      <dt className="text-sm font-medium text-gray-500 shrink-0">{label}</dt>
      <dd className={`text-right font-medium text-gray-900 break-words ${valueClass}`}>{value}</dd>
    </div>
  );
}

export { formatAmount, serviceTypeLabel, serviceTypeBadgeClass, statusBadgeClass };
