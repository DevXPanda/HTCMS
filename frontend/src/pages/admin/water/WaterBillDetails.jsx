import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { waterBillAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { FileText, Droplet, Home, Hash, Wallet } from 'lucide-react';
import DetailPageLayout, { DetailRow } from '../../../components/DetailPageLayout';

const formatAmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatBillingPeriod = (period) => {
  if (!period) return 'N/A';
  const [year, month] = period.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month, 10) - 1]} ${year}`;
};

const WaterBillDetails = () => {
  const { id } = useParams();
  const [bill, setBill] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBill();
  }, [id]);

  const fetchBill = async () => {
    try {
      const response = await waterBillAPI.getById(id);
      setBill(response.data.data.waterBill);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch water bill details');
      setBill(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      partially_paid: 'badge-info',
      paid: 'badge-success',
      overdue: 'badge-danger',
      cancelled: 'badge-danger'
    };
    return badges[status] || 'badge-info';
  };

  if (loading) return <Loading />;
  if (!bill) return <div className="p-6">Water bill not found</div>;

  const summarySection = (
    <>
      <h2 className="form-section-title">Summary</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <Hash className="w-5 h-5 text-gray-500" />
          <span className="stat-card-label">Bill Number</span>
          <span className="stat-card-value">{bill.billNumber}</span>
        </div>
        <div className="stat-card">
          <Wallet className="w-5 h-5 text-gray-500" />
          <span className="stat-card-label">Total Amount</span>
          <span className="stat-card-value text-green-600">{formatAmt(bill.totalAmount)}</span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Balance</span>
          <span className={`stat-card-value ${parseFloat(bill.balanceAmount || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
            {formatAmt(bill.balanceAmount)}
          </span>
        </div>
        <div className="stat-card">
          <span className="stat-card-label">Status</span>
          <span className={`badge ${getStatusBadge(bill.status)} capitalize`}>{bill.status?.replace('_', ' ')}</span>
        </div>
      </div>
    </>
  );

  return (
    <DetailPageLayout
      title="Water Bill Details"
      subtitle={bill.billNumber}
      summarySection={summarySection}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="form-section-title flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Bill Information
          </h2>
          <div className="space-y-0">
            <DetailRow label="Bill Number" value={bill.billNumber} />
            <DetailRow label="Billing Period" value={formatBillingPeriod(bill.billingPeriod)} />
            <DetailRow label="Due Date" value={bill.dueDate ? new Date(bill.dueDate).toLocaleDateString('en-IN') : 'N/A'} />
            <DetailRow label="Total Amount" value={<span className="font-semibold">{formatAmt(bill.totalAmount)}</span>} />
            <DetailRow label="Paid Amount" value={<span className="text-green-600">{formatAmt(bill.paidAmount)}</span>} />
            <DetailRow
              label="Balance"
              value={
                <span className={parseFloat(bill.balanceAmount || 0) > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                  {formatAmt(bill.balanceAmount)}
                </span>
              }
            />
            <DetailRow
              label="Status"
              value={
                <span className={`badge ${getStatusBadge(bill.status)} capitalize`}>
                  {bill.status?.replace('_', ' ')}
                </span>
              }
            />
          </div>
        </div>

        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Droplet className="w-5 h-5 mr-2" />
            Property & Connection
          </h2>
          <div className="space-y-0">
            {bill.waterConnection?.property && (
              <>
                <DetailRow
                  label="Property"
                  value={
                    <Link
                      to={`/properties/${bill.waterConnection.property.id}`}
                      className="text-primary-600 hover:underline"
                    >
                      {bill.waterConnection.property.propertyNumber}
                    </Link>
                  }
                />
                <DetailRow label="Address" value={bill.waterConnection.property.address} />
                {bill.waterConnection.property.city && (
                  <DetailRow label="City" value={bill.waterConnection.property.city} />
                )}
              </>
            )}
            {bill.waterConnection && (
              <>
                <DetailRow
                  label="Connection Number"
                  value={
                    <Link
                      to={`/water/connections/${bill.waterConnection.id}`}
                      className="text-primary-600 hover:underline"
                    >
                      {bill.waterConnection.connectionNumber}
                    </Link>
                  }
                />
                <DetailRow
                  label="Connection Type"
                  value={bill.waterConnection.connectionType || 'N/A'}
                />
                <DetailRow
                  label="Meter Type"
                  value={bill.waterConnection.isMetered ? 'Metered' : 'Non-metered'}
                />
                {bill.waterConnection.meterNumber && (
                  <DetailRow label="Meter Number" value={bill.waterConnection.meterNumber} />
                )}
              </>
            )}
          </div>
        </div>

        {bill.meterReading && (
          <div className="card lg:col-span-2">
            <h2 className="form-section-title flex items-center">
              <Hash className="w-5 h-5 mr-2" />
              Meter Reading
            </h2>
            <div className="space-y-0">
              <DetailRow label="Reading Number" value={bill.meterReading.readingNumber} />
              <DetailRow label="Previous Reading" value={bill.meterReading.previousReading} />
              <DetailRow label="Current Reading" value={bill.meterReading.currentReading} />
              <DetailRow label="Consumption" value={bill.meterReading.consumption} />
              {bill.meterReading.readingDate && (
                <DetailRow
                  label="Reading Date"
                  value={new Date(bill.meterReading.readingDate).toLocaleDateString('en-IN')}
                />
              )}
            </div>
          </div>
        )}

        {(bill.generator || bill.createdAt) && (
          <div className="card lg:col-span-2">
            <h2 className="form-section-title flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Bill History
            </h2>
            <div className="space-y-0">
              {bill.generator && (
                <DetailRow
                  label="Generated By"
                  value={`${bill.generator.firstName} ${bill.generator.lastName}`}
                />
              )}
              {bill.createdAt && (
                <DetailRow label="Generated At" value={new Date(bill.createdAt).toLocaleString('en-IN')} />
              )}
              {bill.updatedAt && (
                <DetailRow label="Last Updated" value={new Date(bill.updatedAt).toLocaleString('en-IN')} />
              )}
            </div>
          </div>
        )}
      </div>
    </DetailPageLayout>
  );
};

export default WaterBillDetails;
