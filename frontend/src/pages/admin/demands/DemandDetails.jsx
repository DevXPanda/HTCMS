import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { demandAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { ArrowLeft, CreditCard, Calculator } from 'lucide-react';

const DemandDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Detect if accessed from citizen routes
  const isCitizenRoute = location.pathname.startsWith('/citizen');
  const basePath = isCitizenRoute ? '/citizen' : '';
  const [demand, setDemand] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDemand();
  }, [id]);

  const fetchDemand = async () => {
    try {
      const response = await demandAPI.getById(id);
      setDemand(response.data.data.demand);
    } catch (error) {
      toast.error('Failed to fetch demand details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!demand) return <div>Demand not found</div>;

  return (
    <div>
      <Link to={`${basePath}/demands`} className="flex items-center text-primary-600 mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Demands
      </Link>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Demand Details</h1>
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
            <h2 className="text-xl font-semibold mb-4">Property Information</h2>
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
