import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { paymentAPI, demandAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Save, Calculator } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const AddPayment = () => {
  const navigate = useNavigate();
  const { isAdmin, isCashier } = useAuth();
  const [loading, setLoading] = useState(false);
  const [demand, setDemand] = useState(null);
  const [loadingDemand, setLoadingDemand] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue
  } = useForm({
    defaultValues: {
      paymentMode: 'cash',
      paymentDate: new Date().toISOString().split('T')[0]
    }
  });

  const watchedPaymentMode = watch('paymentMode');
  const watchedAmount = watch('amount');
  const watchedDemandId = watch('demandId');

  useEffect(() => {
    if (watchedDemandId) {
      fetchDemand(watchedDemandId);
    } else {
      setDemand(null);
    }
  }, [watchedDemandId]);

  const fetchDemand = async (demandId) => {
    try {
      setLoadingDemand(true);
      const response = await demandAPI.getById(demandId);
      setDemand(response.data.data.demand);
      
      // Set max amount to balance amount
      if (response.data.data.demand.balanceAmount > 0) {
        setValue('amount', response.data.data.demand.balanceAmount);
      }
    } catch (error) {
      toast.error('Failed to load demand details');
      setDemand(null);
    } finally {
      setLoadingDemand(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      const paymentData = {
        demandId: parseInt(data.demandId),
        amount: parseFloat(data.amount),
        paymentMode: data.paymentMode,
        paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
        chequeNumber: data.chequeNumber || null,
        chequeDate: data.chequeDate || null,
        bankName: data.bankName || null,
        transactionId: data.transactionId || null,
        remarks: data.remarks || null
      };

      const response = await paymentAPI.create(paymentData);

      if (response.data.success) {
        toast.success('Payment recorded successfully!');
        navigate(`/payments/${response.data.data.payment.id}`);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin && !isCashier) {
    return (
      <div className="card">
        <p className="text-red-600">You don't have permission to record payments.</p>
        <Link to="/payments" className="btn btn-secondary mt-4">Back to Payments</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Link to="/payments" className="mr-4 text-primary-600 hover:text-primary-700">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Record Payment</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        {/* Demand Selection */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Demand Information</h2>
          <div>
            <label className="label">
              Demand Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              {...register('demandId', { 
                required: 'Demand ID is required',
                valueAsNumber: true
              })}
              className="input"
              placeholder="Enter Demand ID"
            />
            {errors.demandId && (
              <p className="text-red-500 text-sm mt-1">{errors.demandId.message}</p>
            )}
            <p className="text-sm text-gray-500 mt-1">
              Enter the Demand ID to load demand details
            </p>
          </div>

          {loadingDemand && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-blue-600">Loading demand details...</p>
            </div>
          )}

          {demand && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold mb-2">Demand Details</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Demand Number:</span>
                  <span className="ml-2 font-medium">{demand.demandNumber}</span>
                </div>
                <div>
                  <span className="text-gray-600">Financial Year:</span>
                  <span className="ml-2 font-medium">{demand.financialYear}</span>
                </div>
                <div>
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="ml-2 font-medium">
                    ₹{parseFloat(demand.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Paid Amount:</span>
                  <span className="ml-2 font-medium text-green-600">
                    ₹{parseFloat(demand.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Balance Amount:</span>
                  <span className="ml-2 font-bold text-red-600 text-lg">
                    ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {demand.property && (
                  <div className="col-span-2">
                    <span className="text-gray-600">Property:</span>
                    <span className="ml-2 font-medium">
                      {demand.property.propertyNumber} - {demand.property.address}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Payment Details */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                {...register('amount', { 
                  required: 'Payment amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than 0' },
                  max: demand ? { 
                    value: parseFloat(demand.balanceAmount || 0), 
                    message: `Amount cannot exceed balance of ₹${parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` 
                  } : undefined,
                  valueAsNumber: true
                })}
                className="input"
                placeholder="0.00"
                disabled={!demand}
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
              )}
              {demand && (
                <p className="text-sm text-gray-500 mt-1">
                  Maximum: ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              )}
            </div>

            <div>
              <label className="label">
                Payment Mode <span className="text-red-500">*</span>
              </label>
              <select
                {...register('paymentMode', { required: 'Payment mode is required' })}
                className="input"
              >
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="dd">Demand Draft (DD)</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
              </select>
              {errors.paymentMode && (
                <p className="text-red-500 text-sm mt-1">{errors.paymentMode.message}</p>
              )}
            </div>

            <div>
              <label className="label">
                Payment Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                {...register('paymentDate', { required: 'Payment date is required' })}
                className="input"
              />
              {errors.paymentDate && (
                <p className="text-red-500 text-sm mt-1">{errors.paymentDate.message}</p>
              )}
            </div>
          </div>
        </div>

        {/* Payment Mode Specific Fields */}
        {(watchedPaymentMode === 'cheque' || watchedPaymentMode === 'dd') && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Cheque/DD Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">
                  {watchedPaymentMode === 'cheque' ? 'Cheque' : 'DD'} Number
                </label>
                <input
                  type="text"
                  {...register('chequeNumber')}
                  className="input"
                  placeholder={`Enter ${watchedPaymentMode === 'cheque' ? 'cheque' : 'DD'} number`}
                />
              </div>

              <div>
                <label className="label">
                  {watchedPaymentMode === 'cheque' ? 'Cheque' : 'DD'} Date
                </label>
                <input
                  type="date"
                  {...register('chequeDate')}
                  className="input"
                />
              </div>

              <div>
                <label className="label">Bank Name</label>
                <input
                  type="text"
                  {...register('bankName')}
                  className="input"
                  placeholder="Enter bank name"
                />
              </div>
            </div>
          </div>
        )}

        {(watchedPaymentMode === 'online' || watchedPaymentMode === 'card') && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Transaction Details</h2>
            <div>
              <label className="label">Transaction ID</label>
              <input
                type="text"
                {...register('transactionId')}
                className="input"
                placeholder="Enter transaction ID"
              />
            </div>
          </div>
        )}

        {/* Remarks */}
        <div>
          <label className="label">Remarks</label>
          <textarea
            {...register('remarks')}
            className="input"
            rows="3"
            placeholder="Any additional notes or comments..."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-4 pt-4 border-t">
          <Link to="/payments" className="btn btn-secondary">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || !demand}
            className="btn btn-primary flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AddPayment;
