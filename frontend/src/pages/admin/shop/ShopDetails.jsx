import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { shopsAPI, shopTaxAssessmentsAPI, demandAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, Edit, Store, FileText, Receipt } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const ShopDetails = () => {
  const { id } = useParams();
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
      setAssessments(response.data.data.assessments || []);
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
      setDemands(shopDemands);
    } catch (error) {
      console.error('Failed to fetch demands:', error);
    }
  };

  if (loading) return <Loading />;
  if (!shop) return <div>Shop not found</div>;

  return (
    <div>
      <Link to="/shop-tax/shops" className="flex items-center text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Shops
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Shop Details</h1>
        {(isAdmin || isAssessor) && (
          <Link
            to={`/shop-tax/shops/${id}/edit`}
            className="btn btn-primary flex items-center"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit Shop
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Store className="w-5 h-5 mr-2" />
            Shop Information
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Shop Number</dt>
              <dd className="text-lg font-semibold">{shop.shopNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Shop Name</dt>
              <dd>{shop.shopName}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Type</dt>
              <dd className="capitalize">{shop.shopType?.replace('_', ' ') || '—'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd>
                <span className={`badge ${
                  shop.status === 'active' ? 'badge-success' :
                  shop.status === 'closed' ? 'badge-danger' :
                  'badge-warning'
                } capitalize`}>
                  {shop.status}
                </span>
              </dd>
            </div>
            {shop.area && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Area</dt>
                <dd>{shop.area} sq. ft.</dd>
              </div>
            )}
            {shop.address && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd>{shop.address}</dd>
              </div>
            )}
            {shop.contactName && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Name</dt>
                <dd>{shop.contactName}</dd>
              </div>
            )}
            {shop.contactPhone && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Contact Phone</dt>
                <dd>{shop.contactPhone}</dd>
              </div>
            )}
            {shop.property && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Property</dt>
                <dd>
                  <Link to={`/properties/${shop.propertyId}`} className="text-primary-600 hover:underline">
                    {shop.property.propertyNumber} – {shop.property.address}
                  </Link>
                </dd>
              </div>
            )}
            {shop.ward && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Ward</dt>
                <dd>{shop.ward.wardName}</dd>
              </div>
            )}
            {shop.owner && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Owner</dt>
                <dd>{shop.owner.firstName} {shop.owner.lastName}</dd>
              </div>
            )}
            {shop.remarks && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Remarks</dt>
                <dd className="text-sm text-gray-700">{shop.remarks}</dd>
              </div>
            )}
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Quick Stats
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Assessments</dt>
              <dd className="text-lg font-semibold">{assessments.length}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Demands</dt>
              <dd className="text-lg font-semibold">{demands.length}</dd>
            </div>
            {demands.length > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Total Outstanding</dt>
                <dd className="text-lg font-semibold text-red-600">
                  ₹{demands.reduce((sum, d) => sum + parseFloat(d.balanceAmount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {assessments.length > 0 && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4">Shop Tax Assessments</h2>
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
                    <td>{assessment.assessmentNumber}</td>
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
                        to={`/shop-tax/assessments/${assessment.id}`}
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
          <h2 className="text-xl font-semibold mb-4">Shop Tax Demands</h2>
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
                    <td>{demand.demandNumber}</td>
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
                        to={`/demands/${demand.id}`}
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
          <Link to={`/shop-tax/assessments/new?shopId=${id}`} className="btn btn-primary mt-4 inline-flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Create Assessment
          </Link>
        </div>
      )}
    </div>
  );
};

export default ShopDetails;
