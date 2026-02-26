import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { paymentAPI, demandAPI, waterBillAPI, waterPaymentAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { Save, Calculator } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';

const AddPayment = () => {
  const navigate = useNavigate();
  const { isAdmin, isCashier } = useAuth();
  const [loading, setLoading] = useState(false);
  const [demand, setDemand] = useState(null);
  const [waterBill, setWaterBill] = useState(null);
  const [loadingDemand, setLoadingDemand] = useState(false);
  const [loadingWaterBill, setLoadingWaterBill] = useState(false);
  const [unpaidWaterBills, setUnpaidWaterBills] = useState([]);
  const [loadingUnpaidBills, setLoadingUnpaidBills] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm({
    defaultValues: {
      paymentType: 'PROPERTY_TAX',
      paymentMode: 'cash',
      paymentDate: new Date().toISOString().split('T')[0]
    }
  });

  const watchedPaymentMode = watch('paymentMode');
  const watchedAmount = watch('amount');
  const watchedDemandId = watch('demandId');
  const watchedWaterBillId = watch('waterBillId');
  const watchedPaymentType = watch('paymentType');

  useEffect(() => {
    if (watchedPaymentType === 'WATER_TAX') {
      fetchUnpaidWaterBills();
      setDemand(null);
      setValue('demandId', '');
    } else {
      setWaterBill(null);
      setUnpaidWaterBills([]);
      setValue('waterBillId', '');
    }
  }, [watchedPaymentType, setValue]);

  useEffect(() => {
    if (watchedDemandId && (watchedPaymentType === 'PROPERTY_TAX' || watchedPaymentType === 'SHOP_TAX')) {
      fetchDemand(watchedDemandId);
    } else {
      setDemand(null);
    }
  }, [watchedDemandId, watchedPaymentType]);

  useEffect(() => {
    if (watchedWaterBillId && watchedPaymentType === 'WATER_TAX') {
      fetchWaterBill(watchedWaterBillId);
    } else {
      setWaterBill(null);
    }
  }, [watchedWaterBillId, watchedPaymentType]);

  const fetchUnpaidWaterBills = async () => {
    try {
      setLoadingUnpaidBills(true);
      const response = await waterBillAPI.getAll({
        status: 'pending,partially_paid,overdue',
        limit: 100
      });
      setUnpaidWaterBills(response.data.data.waterBills || []);
    } catch (error) {
      toast.error('Failed to load unpaid water bills');
      setUnpaidWaterBills([]);
    } finally {
      setLoadingUnpaidBills(false);
    }
  };

  const fetchWaterBill = async (billId) => {
    try {
      setLoadingWaterBill(true);
      const response = await waterBillAPI.getById(billId);
      setWaterBill(response.data.data.waterBill);

      // Set max amount to balance amount
      if (response.data.data.waterBill.balanceAmount > 0) {
        setValue('amount', response.data.data.waterBill.balanceAmount);
      }
    } catch (error) {
      toast.error('Failed to load water bill details');
      setWaterBill(null);
    } finally {
      setLoadingWaterBill(false);
    }
  };

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

      if (data.paymentType === 'PROPERTY_TAX' || data.paymentType === 'SHOP_TAX') {
        // Property Tax Payment
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
      } else if (data.paymentType === 'WATER_TAX') {
        // Water Tax Payment
        const paymentData = {
          waterBillId: parseInt(data.waterBillId),
          amount: parseFloat(data.amount),
          paymentMode: data.paymentMode,
          paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
          chequeNumber: data.chequeNumber || null,
          chequeDate: data.chequeDate || null,
          bankName: data.bankName || null,
          transactionId: data.transactionId || null,
          remarks: data.remarks || null
        };

        const response = await waterPaymentAPI.create(paymentData);

        if (response.data.success) {
          toast.success('Water payment recorded successfully!');
          // Show receipt confirmation
          const receiptNumber = response.data.data.waterPayment.receiptNumber;
          const paymentId = response.data.data.waterPayment.id;

          // Navigate to water payment details (we'll need to create this page or use a generic receipt view)
          // For now, show success message with receipt number
          toast.success(`Receipt Number: ${receiptNumber}`, { duration: 5000 });

          // Navigate to water payments page or show receipt
          // Since we don't have a water payment details page yet, navigate to water payments list
          navigate('/water/payments');
        }
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
        <h1 className="ds-page-title">Record Payment</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-6">
        {/* Payment Type Selection */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Payment Type</h2>
          <div>
            <label className="label">
              Payment Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('paymentType', { required: 'Payment type is required' })}
              className="input"
              onChange={(e) => {
                setValue('paymentType', e.target.value);
                reset({
                  paymentType: e.target.value,
                  paymentMode: 'cash',
                  paymentDate: new Date().toISOString().split('T')[0]
                });
              }}
            >
              <option value="PROPERTY_TAX">Property Tax</option>
              <option value="SHOP_TAX">Shop Tax</option>
              <option value="WATER_TAX">Water Tax</option>
            </select>
            {errors.paymentType && (
              <p className="text-red-500 text-sm mt-1">{errors.paymentType.message}</p>
            )}
          </div>
        </div>

        {/* Property Tax - Demand Selection */}
        {((watchedPaymentType === 'PROPERTY_TAX') || (watchedPaymentType === 'SHOP_TAX')) && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Demand Information</h2>
            <div>
              <label className="label">
                Demand ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                {...register('demandId', {
                  required: (watchedPaymentType === 'PROPERTY_TAX' || watchedPaymentType === 'SHOP_TAX') ? 'Demand ID is required' : false,
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
                    <span className="text-gray-600">Type:</span>
                    <span className="ml-2 font-medium">{demand.serviceType ? demand.serviceType.replace(/_/g, ' ') : '—'}</span>
                  </div>
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
        )}

        {/* Water Tax - Bill Selection */}
        {watchedPaymentType === 'WATER_TAX' && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Water Bill Information</h2>
            <div>
              <label className="label">
                Select Unpaid Water Bill <span className="text-red-500">*</span>
              </label>
              {loadingUnpaidBills ? (
                <div className="input bg-gray-100">Loading unpaid bills...</div>
              ) : (
                <select
                  {...register('waterBillId', {
                    required: watchedPaymentType === 'WATER_TAX' ? 'Water bill is required' : false
                  })}
                  className="input"
                >
                  <option value="">Select a water bill</option>
                  {unpaidWaterBills.map(bill => (
                    <option key={bill.id} value={bill.id}>
                      {bill.billNumber} - {bill.waterConnection?.property?.propertyNumber || 'N/A'} -
                      Period: {bill.billingPeriod} -
                      Balance: ₹{parseFloat(bill.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </option>
                  ))}
                </select>
              )}
              {errors.waterBillId && (
                <p className="text-red-500 text-sm mt-1">{errors.waterBillId.message}</p>
              )}
              {unpaidWaterBills.length === 0 && !loadingUnpaidBills && (
                <p className="text-sm text-gray-500 mt-1">
                  No unpaid water bills found
                </p>
              )}
            </div>

            {loadingWaterBill && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-600">Loading water bill details...</p>
              </div>
            )}

            {waterBill && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-semibold mb-2">Water Bill Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Bill Number:</span>
                    <span className="ml-2 font-medium">{waterBill.billNumber}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Billing Period:</span>
                    <span className="ml-2 font-medium">{waterBill.billingPeriod}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="ml-2 font-medium">
                      ₹{parseFloat(waterBill.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Paid Amount:</span>
                    <span className="ml-2 font-medium text-green-600">
                      ₹{parseFloat(waterBill.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">Balance Amount:</span>
                    <span className="ml-2 font-bold text-red-600 text-lg">
                      ₹{parseFloat(waterBill.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {waterBill.waterConnection?.property && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Property:</span>
                      <span className="ml-2 font-medium">
                        {waterBill.waterConnection.property.propertyNumber} - {waterBill.waterConnection.property.address}
                      </span>
                    </div>
                  )}
                  {waterBill.waterConnection && (
                    <div className="col-span-2">
                      <span className="text-gray-600">Connection:</span>
                      <span className="ml-2 font-medium">
                        {waterBill.waterConnection.connectionNumber}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Payment Details */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Payment Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">
                Payment Amount (₹) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                inputMode="decimal"
                {...register('amount', {
                  required: 'Payment amount is required',
                  validate: (value) => {
                    const numValue = parseFloat(value);
                    if (isNaN(numValue) || numValue <= 0) {
                      return 'Amount must be greater than 0';
                    }
                    const maxAmount = parseFloat((watchedPaymentType === 'PROPERTY_TAX' ? demand : waterBill)?.balanceAmount || 0);
                    if (numValue > maxAmount) {
                      return `Amount cannot exceed balance of ₹${maxAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                    }
                    return true;
                  }
                })}
                className="input"
                placeholder="0.00"
                disabled={watchedPaymentType === 'PROPERTY_TAX' ? !demand : !waterBill}
              />
              {errors.amount && (
                <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
              )}
              {(watchedPaymentType === 'PROPERTY_TAX' ? demand : waterBill) && (
                <p className="text-sm text-gray-500 mt-1">
                  Maximum: ₹{parseFloat((watchedPaymentType === 'PROPERTY_TAX' ? demand : waterBill).balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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
            disabled={loading || (watchedPaymentType === 'PROPERTY_TAX' ? !demand : !waterBill)}
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
