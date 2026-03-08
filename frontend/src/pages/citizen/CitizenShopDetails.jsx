import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { shopsAPI, shopTaxAssessmentsAPI, demandAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Store, FileText, Receipt } from 'lucide-react';
import DetailPageLayout, { DetailRow } from '../../components/DetailPageLayout';

const CitizenShopDetails = () => {
  const { id } = useParams();
  const [shop, setShop] = useState(null);
  const [assessments, setAssessments] = useState([]);
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShop();
    fetchAssessments();
    fetchDemands();
  }, [id]);

  const fetchShop = async () => {
    try {
      const response = await shopsAPI.getById(id);
      setShop(response.data.data.shop);
    } catch (error) {
      toast.error('Failed to fetch shop details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAssessments = async () => {
    try {
      const response = await shopTaxAssessmentsAPI.getAll({ shopId: id, limit: 100 });
      setAssessments(response.data.data.assessments || []);
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
    }
  };

  const fetchDemands = async () => {
    try {
      const response = await demandAPI.getAll({ serviceType: 'SHOP_TAX', limit: 100 });
      const shopDemands = (response.data.data.demands || []).filter(
        (d) => d.shopTaxAssessment?.shop?.id === parseInt(id) || d.shopTaxAssessment?.shopId === parseInt(id)
      );
      setDemands(shopDemands);
    } catch (error) {
      console.error('Failed to fetch demands:', error);
    }
  };

  if (loading) return <Loading />;
  if (!shop) return <div className="card text-center py-8 text-gray-600">Shop not found</div>;

  const statusBadgeClass = () => {
    const s = (shop.status || '').toLowerCase();
    if (s === 'active') return 'badge-success';
    if (s === 'closed') return 'badge-danger';
    return 'badge-warning';
  };

  const totalOutstanding = demands.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0);

  return (
    <DetailPageLayout
      title={shop.shopName || 'Shop Details'}
      subtitle={`Shop Number: ${shop.shopNumber}`}
      actionButtons={
        <Link to="/citizen/shops" className="text-primary-600 hover:text-primary-700 font-medium text-sm">
          ← Back to My Shops
        </Link>
      }
      summarySection={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-card-title"><span>Shop Number</span></div>
            <p className="stat-card-value text-lg font-bold text-primary-600">{shop.shopNumber}</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Status</span></div>
            <p className="stat-card-value text-base">
              <span className={`badge capitalize ${statusBadgeClass()}`}>{shop.status || '—'}</span>
            </p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Type</span></div>
            <p className="stat-card-value text-lg capitalize">{shop.shopType?.replace('_', ' ') || '—'}</p>
          </div>
          <div className="stat-card">
            <div className="stat-card-title"><span>Assessments / Demands</span></div>
            <p className="stat-card-value text-lg">{assessments.length} / {demands.length}</p>
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card flex flex-col">
          <h2 className="form-section-title flex items-center">
            <Store className="w-5 h-5 mr-2 text-primary-600" />
            Shop Information
          </h2>
          <div className="flex-1">
            <dl>
              <DetailRow label="Shop Number" value={shop.shopNumber} valueClass="font-semibold" />
              <DetailRow label="Shop Name" value={shop.shopName} />
              <DetailRow label="Type" value={shop.shopType?.replace('_', ' ')} valueClass="capitalize" />
              <DetailRow
                label="Status"
                value={<span className={`badge capitalize ${statusBadgeClass()}`}>{shop.status}</span>}
              />
              {shop.area != null && shop.area !== '' && (
                <DetailRow label="Area" value={`${shop.area} sq. ft.`} />
              )}
              {shop.address && <DetailRow label="Address" value={shop.address} />}
              {shop.property && (
                <DetailRow
                  label="Property"
                  value={
                    <Link to={`/citizen/properties/${shop.propertyId}`} className="text-primary-600 hover:underline font-medium">
                      {shop.property.propertyNumber} – {shop.property.address}
                    </Link>
                  }
                />
              )}
              {shop.ward && <DetailRow label="Ward" value={shop.ward.wardName} />}
            </dl>
          </div>
        </div>

        <div className="card flex flex-col">
          <h2 className="form-section-title flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary-600" />
            Quick Stats
          </h2>
          <div className="flex-1">
            <dl>
              <DetailRow label="Assessments" value={assessments.length} valueClass="font-semibold text-lg" />
              <DetailRow label="Demands" value={demands.length} valueClass="font-semibold text-lg" />
              {demands.length > 0 && totalOutstanding > 0 && (
                <DetailRow
                  label="Total Outstanding"
                  value={`₹${totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
                  valueClass="font-semibold text-lg text-red-600"
                />
              )}
            </dl>
          </div>
        </div>
      </div>

      {assessments.length > 0 && (
        <div className="card mt-6">
          <h2 className="form-section-title flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary-600" />
            Shop Tax Assessments
          </h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Assessment Number</th>
                  <th>Year</th>
                  <th>Financial Year</th>
                  <th>Annual Tax</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map((assessment) => (
                  <tr key={assessment.id}>
                    <td>{assessment.assessmentNumber}</td>
                    <td>{assessment.assessmentYear}</td>
                    <td>{assessment.financialYear || '—'}</td>
                    <td>₹{parseFloat(assessment.annualTaxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span
                        className={`badge ${
                          assessment.status === 'approved'
                            ? 'badge-success'
                            : assessment.status === 'pending'
                              ? 'badge-warning'
                              : assessment.status === 'rejected'
                                ? 'badge-danger'
                                : 'badge-info'
                        } capitalize`}
                      >
                        {assessment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {demands.length > 0 && (
        <div className="card mt-6">
          <h2 className="form-section-title flex items-center">
            <Receipt className="w-5 h-5 mr-2 text-primary-600" />
            Shop Tax Demands
          </h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Demand Number</th>
                  <th>Financial Year</th>
                  <th>Total Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Due Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {demands.map((demand) => (
                  <tr key={demand.id}>
                    <td className="font-medium">{demand.demandNumber}</td>
                    <td>{demand.financialYear}</td>
                    <td>₹{parseFloat(demand.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="text-green-600">
                      ₹{parseFloat(demand.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={demand.balanceAmount > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                      ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>{new Date(demand.dueDate).toLocaleDateString()}</td>
                    <td>
                      <span
                        className={`badge ${
                          demand.status === 'paid'
                            ? 'badge-success'
                            : demand.status === 'partially_paid'
                              ? 'badge-warning'
                              : demand.status === 'overdue'
                                ? 'badge-danger'
                                : 'badge-info'
                        } capitalize`}
                      >
                        {demand.status}
                      </span>
                    </td>
                    <td>
                      {demand.balanceAmount > 0 && (
                        <Link to={`/citizen/payments/online/${demand.id}`} className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                          Pay Now
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {assessments.length === 0 && demands.length === 0 && (
        <div className="card mt-6 text-center py-8">
          <p className="text-gray-500">No assessments or demands found for this shop.</p>
        </div>
      )}
    </DetailPageLayout>
  );
};

export default CitizenShopDetails;
