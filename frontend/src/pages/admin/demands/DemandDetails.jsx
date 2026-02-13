import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { demandAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, CreditCard, Calculator, Droplet, Home, FileText } from 'lucide-react';
import { useShopTaxBasePath } from '../../../contexts/ShopTaxBasePathContext';

const DemandDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isCitizenRoute = location.pathname.startsWith('/citizen');
  const basePath = useShopTaxBasePath() || (isCitizenRoute ? '/citizen' : '');
  const [demand, setDemand] = useState(null);
  const [loading, setLoading] = useState(true);
  const [breakdown, setBreakdown] = useState(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

  useEffect(() => {
    fetchDemand();
  }, [id]);

  useEffect(() => {
    if (demand?.id) {
      fetchBreakdown();
    }
  }, [demand]);

  const fetchDemand = async () => {
    try {
      const response = await demandAPI.getById(id);
      if (response.data.success && response.data.data.demand) {
        setDemand(response.data.data.demand);
      } else {
        console.error('Invalid response format:', response.data);
        toast.error(response.data.message || 'Failed to fetch tax demand details');
      }
    } catch (error) {
      console.error('Error fetching demand:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to fetch tax demand details';
      toast.error(errorMessage);
      if (error.response?.status === 403) {
        console.error('Access denied - ward check failed or no access');
      } else if (error.response?.status === 404) {
        console.error('Demand not found in database');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchBreakdown = async () => {
    try {
      setLoadingBreakdown(true);
      const response = await demandAPI.getBreakdown(id);
      if (response.data.data.isUnified) {
        setBreakdown(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch demand breakdown:', error);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  if (loading) return <Loading />;
  if (!demand) return <div>Tax Demand not found</div>;

  return (
    <div>
      <Link to={`${basePath}/demands`} className="flex items-center text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Tax Demands
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Tax Demand Details</h1>
        {demand.balanceAmount > 0 && (
          <Link
            to={`${basePath}/payments/online/${id}`}
            className="btn btn-primary flex items-center"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Pay Online
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Demand Information</h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Demand Number</dt>
              <dd className="text-lg font-semibold">{demand.demandNumber}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Financial Year</dt>
              <dd>{demand.financialYear}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Base Amount</dt>
              <dd>₹{parseFloat(demand.baseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</dd>
            </div>
            {parseFloat(demand.arrearsAmount || 0) > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Arrears Amount</dt>
                <dd className="text-orange-600 font-semibold">
                  ₹{parseFloat(demand.arrearsAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </dd>
              </div>
            )}
            {parseFloat(demand.penaltyAmount || 0) > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Penalty</dt>
                <dd className="text-red-600">
                  ₹{parseFloat(demand.penaltyAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </dd>
              </div>
            )}
            {parseFloat(demand.interestAmount || 0) > 0 && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Interest</dt>
                <dd className="text-red-600">
                  ₹{parseFloat(demand.interestAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </dd>
              </div>
            )}
            <div className="border-t pt-3 mt-3">
              <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
              <dd className="text-lg font-semibold">
                ₹{parseFloat(demand.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Paid Amount</dt>
              <dd className="text-green-600 font-semibold">
                ₹{parseFloat(demand.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Balance Amount</dt>
              <dd className={`text-lg font-semibold ${demand.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Due Date</dt>
              <dd className={new Date(demand.dueDate) < new Date() && demand.balanceAmount > 0 ? 'text-red-600 font-semibold' : ''}>
                {new Date(demand.dueDate).toLocaleDateString()}
                {new Date(demand.dueDate) < new Date() && demand.balanceAmount > 0 && (
                  <span className="ml-2 text-xs">⚠️ Overdue</span>
                )}
              </dd>
            </div>
            {demand.assessment && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Assessment</dt>
                <dd>
                  <Link to={`/assessments/${demand.assessmentId}`} className="text-primary-600 hover:underline">
                    {demand.assessment.assessmentNumber}
                  </Link>
                </dd>
              </div>
            )}
            {demand.generatedBy && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Generated By</dt>
                <dd>User ID: {demand.generatedBy}</dd>
              </div>
            )}
            {demand.generatedDate && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Generated Date</dt>
                <dd>{new Date(demand.generatedDate).toLocaleDateString()}</dd>
              </div>
            )}
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd>
                <span className="badge badge-info capitalize">
                  {demand.status.replace('_', ' ')}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Payment History</h2>
          {demand.payments && demand.payments.length > 0 ? (
            <div className="space-y-3">
              {demand.payments.map((payment) => (
                <div key={payment.id} className="border-b pb-3 last:border-b-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium block">{payment.receiptNumber}</span>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(payment.paymentDate).toLocaleDateString()} - {payment.paymentMode}
                      </p>
                      {payment.cashier && (
                        <p className="text-xs text-gray-400 mt-1">
                          Cashier: {payment.cashier.firstName} {payment.cashier.lastName}
                        </p>
                      )}
                    </div>
                    <span className="text-green-600 font-semibold">
                      ₹{parseFloat(payment.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              ))}
              <div className="pt-3 border-t mt-3">
                <div className="flex justify-between font-semibold">
                  <span>Total Paid:</span>
                  <span className="text-green-600">
                    ₹{parseFloat(demand.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No payments recorded</p>
          )}
        </div>

        {demand.property && (
          <div className="card lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Home className="w-5 h-5 mr-2" />
              Property Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Property Number</dt>
                <dd>
                  <Link to={`/properties/${demand.propertyId}`} className="text-primary-600 hover:underline">
                    {demand.property.propertyNumber}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd>{demand.property.address}</dd>
              </div>
              {demand.property.ward && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Ward</dt>
                  <dd>{demand.property.ward.wardName}</dd>
                </div>
              )}
              {demand.property.owner && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Owner</dt>
                  <dd>
                    {demand.property.owner.firstName} {demand.property.owner.lastName}
                  </dd>
                </div>
              )}
            </div>

            {/* Water Connections Section */}
            {breakdown?.demand?.property?.waterConnections && breakdown.demand.property.waterConnections.length > 0 && (
              <div className="mt-6 pt-6 border-t">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Droplet className="w-5 h-5 mr-2" />
                  Water Connections
                </h3>
                <div className="space-y-3">
                  {breakdown.demand.property.waterConnections.map((connection) => (
                    <div key={connection.id} className="bg-gray-50 p-3 rounded-lg">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className="font-medium">{connection.connectionNumber}</p>
                          <div className="flex gap-2 mt-1">
                            <span className="badge badge-info text-xs">{connection.connectionType}</span>
                            <span className={`badge text-xs ${connection.isMetered ? 'badge-success' : 'badge-secondary'}`}>
                              {connection.isMetered ? 'Metered' : 'Non-metered'}
                            </span>
                          </div>
                          {connection.meterNumber && (
                            <p className="text-sm text-gray-600 mt-1">Meter: {connection.meterNumber}</p>
                          )}
                        </div>
                        <span className={`badge ${connection.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}`}>
                          {connection.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Unified Demand Breakdown */}
        {breakdown && breakdown.isUnified && breakdown.items && breakdown.items.length > 0 && (
          <div className="card lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              Unified Tax Demand Breakdown
            </h2>

            <div className="space-y-6">
              {/* Property Tax Breakdown */}
              {breakdown.items.filter(item => item.taxType === 'PROPERTY').length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-800 mb-3">Property Tax Breakdown</h3>
                  {breakdown.items.filter(item => item.taxType === 'PROPERTY').map((item) => (
                    <dl key={item.id} className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <dt className="text-sm text-blue-700">Assessed Value</dt>
                        <dd className="font-semibold">
                          ₹{parseFloat(item.metadata?.assessedValue || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-blue-700">Tax Rate</dt>
                        <dd className="font-semibold">{item.metadata?.taxRate || 0}%</dd>
                      </div>
                      <div>
                        <dt className="text-sm text-blue-700">Property Tax Amount</dt>
                        <dd className="font-semibold text-green-600">
                          ₹{parseFloat(item.baseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-sm text-blue-700">Arrears</dt>
                        <dd className="font-semibold">
                          ₹{parseFloat(item.arrearsAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </dd>
                      </div>
                    </dl>
                  ))}
                  <p className="mt-3 text-xs text-blue-700">
                    Note: Penalty/interest (if any) are applied at demand level, not per item.
                  </p>
                </div>
              )}

              {/* Water Tax Breakdown */}
              {breakdown.items.filter(item => item.taxType === 'WATER').length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-3">Water Tax Breakdown (Per Connection)</h3>
                  <div className="space-y-4">
                    {breakdown.items.filter(item => item.taxType === 'WATER').map((item) => (
                      <div key={item.id} className="bg-white p-3 rounded border">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <p className="font-medium">Connection No: {item.metadata?.connectionNumber || item.connectionId}</p>
                            <p className="text-sm text-gray-600">{item.metadata?.connectionType || 'N/A'}</p>
                          </div>
                        </div>
                        <dl className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-3">
                          <div>
                            <dt className="text-xs text-gray-600">Assessment Type</dt>
                            <dd className="font-medium">{item.metadata?.assessmentType || 'N/A'}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-600">Water Tax Amount</dt>
                            <dd className="font-semibold text-green-600">
                              ₹{parseFloat(item.baseAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-600">Arrears</dt>
                            <dd className="font-medium">
                              ₹{parseFloat(item.arrearsAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-600">Subtotal (Base + Arrears)</dt>
                            <dd className="font-bold text-green-700">
                              ₹{parseFloat(item.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </dd>
                          </div>
                        </dl>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grand Total Summary */}
              <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-300">
                <h3 className="font-bold text-purple-800 mb-3 text-lg">Grand Total Summary</h3>
                <dl className="space-y-2">
                  {breakdown.breakdown?.note && (
                    <div className="text-sm text-purple-700 bg-purple-100 border border-purple-200 rounded p-2">
                      {breakdown.breakdown.note}
                    </div>
                  )}
                  <div className="flex justify-between">
                    <dt className="text-purple-700">Property Subtotal (Base + Arrears)</dt>
                    <dd className="font-semibold">
                      ₹{parseFloat(breakdown.items.filter(i => i.taxType === 'PROPERTY').reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-purple-700">Water Subtotal (Base + Arrears)</dt>
                    <dd className="font-semibold">
                      ₹{parseFloat(breakdown.items.filter(i => i.taxType === 'WATER').reduce((sum, item) => sum + parseFloat(item.totalAmount || 0), 0) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-purple-700">Penalty (Demand-level)</dt>
                    <dd className="font-semibold">
                      ₹{parseFloat(breakdown.demand?.penaltyAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-purple-700">Interest (Demand-level)</dt>
                    <dd className="font-semibold">
                      ₹{parseFloat(breakdown.demand?.interestAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </dd>
                  </div>
                  <div className="border-t border-purple-300 pt-2 mt-2">
                    <div className="flex justify-between">
                      <dt className="text-lg font-bold text-purple-900">GRAND TOTAL PAYABLE</dt>
                      <dd className="text-2xl font-bold text-purple-900">
                        ₹{parseFloat(breakdown.demand?.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </dd>
                    </div>
                  </div>
                </dl>
              </div>
            </div>
          </div>
        )}

        {demand.remarks && (
          <div className="card lg:col-span-2">
            <h2 className="text-xl font-semibold mb-4">Remarks</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{demand.remarks}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DemandDetails;
