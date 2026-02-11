import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { shopsAPI, shopTaxAssessmentsAPI, demandAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, Store, FileText, Receipt } from 'lucide-react';

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
      <Link to="/citizen/shops" className="flex items-center text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to My Shops
      </Link>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center">
          <Store className="w-8 h-8 mr-3 text-amber-600" />
          {shop.shopName}
        </h1>
        <p className="text-gray-600 mt-2">Shop Number: {shop.shopNumber}</p>
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
            {shop.property && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Property</dt>
                <dd>
                  <Link to={`/citizen/properties/${shop.propertyId}`} className="text-primary-600 hover:underline">
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
                  <th>Financial Year</th>
                  <th>Annual Tax</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {assessments.map(assessment => (
                  <tr key={assessment.id}>
                    <td>{assessment.assessmentNumber}</td>
                    <td>{assessment.assessmentYear}</td>
                    <td>{assessment.financialYear || '—'}</td>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {demands.length > 0 && (
        <div className="card mt-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Receipt className="w-5 h-5 mr-2" />
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
                {demands.map(demand => (
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
                      {demand.balanceAmount > 0 && (
                        <Link
                          to={`/citizen/payments/online/${demand.id}`}
                          className="text-green-600 hover:text-green-700 text-sm font-medium"
                        >
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
    </div>
  );
};

export default CitizenShopDetails;
