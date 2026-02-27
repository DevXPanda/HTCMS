import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { shopsAPI, shopTaxAssessmentsAPI, demandAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { Edit, Store, FileText, TrendingUp, Building2 } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';
import { isRecentDate, sortByCreatedDesc } from '../../../utils/dateUtils';
import DetailPageLayout, { DetailRow } from '../../../components/DetailPageLayout';

const ShopDetails = () => {
  const { id } = useParams();
  const basePath = useShopTaxBasePath();
  const { isAdmin, isAssessor } = useAuth();
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
      const list = response.data.data.assessments || [];
      setAssessments([...list].sort(sortByCreatedDesc));
    } catch (error) {
      console.error('Failed to fetch assessments:', error);
    }
  };

  const fetchDemands = async () => {
    try {
      const response = await demandAPI.getAll({ serviceType: 'SHOP_TAX', limit: 100 });
      const shopDemands = (response.data.data.demands || []).filter(
        d => d.shopTaxAssessment?.shop?.id === parseInt(id) || d.shopTaxAssessment?.shopId === parseInt(id)
      );
      setDemands([...shopDemands].sort(sortByCreatedDesc));
    } catch (error) {
      console.error('Failed to fetch demands:', error);
    }
  };

  if (loading) return <Loading />;
  if (!shop) return <div>Shop not found</div>;

  const statusBadgeClass = () => {
    const s = (shop.status || '').toLowerCase();
    if (s === 'active') return 'badge-success';
    if (s === 'closed') return 'badge-danger';
    return 'badge-warning';
  };

  const licenseBadgeClass = () => {
    const s = (shop.licenseStatus || '').toLowerCase();
    if (s === 'valid') return 'badge-success';
    if (s === 'expired') return 'badge-danger';
    return 'badge-warning';
  };

  const totalOutstanding = demands.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0);

  return (
    <DetailPageLayout
      backTo={`${basePath}/shop-tax/shops`}
      backLabel="Back to Shops"
      showBackLink={false}
      title="Shop Details"
      subtitle={shop.shopNumber}
      actionButtons={
        (isAdmin || isAssessor || basePath === '/clerk') && (
          <Link
            to={`${basePath}/shop-tax/shops/${id}/edit`}
            className="btn btn-primary flex items-center"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Shop
          </Link>
        )
      }
      summarySection={
        <>
          <h2 className="form-section-title flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-primary-600" />
            Summary
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-card-title"><span>Shop Number</span></div>
              <p className="stat-card-value text-lg font-bold text-primary-600">{shop.shopNumber}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Status</span></div>
              <p className="stat-card-value text-base">
                <span className={`badge capitalize ${statusBadgeClass()}`}>{shop.status}</span>
              </p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Assessments</span></div>
              <p className="stat-card-value text-lg font-bold">{assessments.length}</p>
            </div>
            <div className="stat-card">
              <div className="stat-card-title"><span>Demands</span></div>
              <p className="stat-card-value text-lg font-bold">{demands.length}</p>
              {demands.length > 0 && totalOutstanding > 0 && (
                <p className="text-sm text-red-600 font-semibold mt-1">
                  ₹{totalOutstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })} outstanding
                </p>
              )}
            </div>
          </div>
        </>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Store className="w-5 h-5 mr-2 text-primary-600" />
            Shop Information
          </h2>
          <dl>
            <DetailRow label="Shop Number" value={shop.shopNumber} valueClass="font-semibold" />
            <DetailRow label="Shop Name" value={shop.shopName} />
            <DetailRow label="Type" value={shop.shopType?.replace('_', ' ')} valueClass="capitalize" />
            <DetailRow
              label="Status"
              value={<span className={`badge capitalize ${statusBadgeClass()}`}>{shop.status}</span>}
            />
            <DetailRow label="Area" value={shop.area != null ? `${shop.area} sq. ft.` : null} />
            <DetailRow label="Address" value={shop.address} />
            <DetailRow label="Contact Name" value={shop.contactName} />
            <DetailRow label="Contact Phone" value={shop.contactPhone} />
            {(shop.tradeLicenseNumber || shop.licenseValidFrom || shop.licenseValidTo || shop.licenseStatus) && (
              <>
                <div className="py-3 border-b border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-700">Trade License</h3>
                </div>
                <DetailRow label="License Number" value={shop.tradeLicenseNumber} />
                <DetailRow label="Valid From" value={shop.licenseValidFrom ? new Date(shop.licenseValidFrom).toLocaleDateString() : null} />
                <DetailRow label="Valid To" value={shop.licenseValidTo ? new Date(shop.licenseValidTo).toLocaleDateString() : null} />
                <DetailRow
                  label="License Status"
                  value={shop.licenseStatus ? <span className={`badge capitalize ${licenseBadgeClass()}`}>{shop.licenseStatus}</span> : null}
                />
              </>
            )}
            <DetailRow label="Remarks" value={shop.remarks} valueClass="text-sm text-gray-700" />
          </dl>
        </div>

        <div className="card">
          <h2 className="form-section-title flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-primary-600" />
            Property & Ward
          </h2>
          <dl>
            {shop.property && (
              <DetailRow
                label="Property"
                value={
                  <Link to={`${basePath}/properties/${shop.propertyId}`} className="text-primary-600 hover:underline">
                    {shop.property.propertyNumber} – {shop.property.address}
                  </Link>
                }
              />
            )}
            <DetailRow label="Ward" value={shop.ward?.wardName} />
            {shop.owner && (
              <DetailRow
                label="Owner"
                value={`${shop.owner.firstName || ''} ${shop.owner.lastName || ''}`.trim()}
              />
            )}
          </dl>
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
                  <th>Annual Tax</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map(assessment => (
                  <tr key={assessment.id}>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        {assessment.assessmentNumber}
                        {isRecentDate(assessment.createdAt) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Recent</span>
                        )}
                      </span>
                    </td>
                    <td>{assessment.assessmentYear}</td>
                    <td>₹{parseFloat(assessment.annualTaxAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td>
                      <span className={`badge ${
                        assessment.status === 'approved' ? 'badge-success' :
                        assessment.status === 'pending' ? 'badge-warning' :
                        assessment.status === 'rejected' ? 'badge-danger' :
                        'badge-info'
                      } capitalize`}>
                        {assessment.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`${basePath}/shop-tax/assessments/${assessment.id}`}
                        className="text-primary-600 hover:underline"
                      >
                        View
                      </Link>
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
            <FileText className="w-5 h-5 mr-2 text-primary-600" />
            Shop Tax Demands
          </h2>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Demand Number</th>
                  <th>Financial Year</th>
                  <th>Total Amount</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {demands.map(demand => (
                  <tr key={demand.id}>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        {demand.demandNumber}
                        {isRecentDate(demand.createdAt || demand.generatedDate) && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Recent</span>
                        )}
                      </span>
                    </td>
                    <td>{demand.financialYear}</td>
                    <td>₹{parseFloat(demand.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className={demand.balanceAmount > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                      ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`badge ${
                        demand.status === 'paid' ? 'badge-success' :
                        demand.status === 'partially_paid' ? 'badge-warning' :
                        demand.status === 'overdue' ? 'badge-danger' :
                        'badge-info'
                      } capitalize`}>
                        {demand.status}
                      </span>
                    </td>
                    <td>
                      <Link
                        to={`${basePath}/demands/${demand.id}`}
                        className="text-primary-600 hover:underline"
                      >
                        View
                      </Link>
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
          <Link to={`${basePath}/shop-tax/assessments/new?shopId=${id}`} className="btn btn-primary mt-4 inline-flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Create Assessment
          </Link>
        </div>
      )}
    </DetailPageLayout>
  );
};

export default ShopDetails;
