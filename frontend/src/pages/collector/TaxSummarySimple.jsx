import { useState, useEffect } from 'react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import { toast } from 'react-hot-toast';
import { demandAPI, paymentAPI, uploadAPI } from '../../services/api';
import { CreditCard, X, Upload, Check } from 'lucide-react';

const TaxSummarySimple = () => {
  const { user } = useStaffAuth();
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMode: 'CASH',
    chequeNumber: '',
    chequeDate: '',
    bankName: '',
    transactionId: '',
    accountHolderName: '', // Add account holder name
    proofFile: null
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchTaxSummary();
  }, []);

  const fetchTaxSummary = async () => {
    try {
      setLoading(true);
      console.log('Fetching tax summary...');
      
      const response = await demandAPI.getAll({
        remarks: 'UNIFIED_DEMAND'
      });
      
      console.log('Response:', response.data);
      
      const unifiedDemands = response.data.data.demands.filter(demand => 
        demand.remarks && demand.remarks.includes('UNIFIED_DEMAND')
      );
      
      console.log('Unified demands:', unifiedDemands);
      setDemands(unifiedDemands);
    } catch (error) {
      console.error('Error fetching tax summary:', error);
      toast.error('Failed to fetch tax summary');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentModal = (demand) => {
    setSelectedDemand(demand);
    setPaymentForm({
      amount: demand.balanceAmount || 0,
      paymentMode: 'CASH',
      chequeNumber: '',
      chequeDate: '',
      bankName: '',
      transactionId: '',
      accountHolderName: '', // Add account holder name
      proofFile: null
    });
    setFormErrors({});
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedDemand(null);
    setPaymentForm({
      amount: '',
      paymentMode: 'CASH',
      chequeNumber: '',
      chequeDate: '',
      bankName: '',
      transactionId: '',
      accountHolderName: '', // Add account holder name
      proofFile: null
    });
    setFormErrors({});
  };

  const handleFormChange = (field, value) => {
    setPaymentForm(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (formErrors[field]) {
      setFormErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPaymentForm(prev => ({ ...prev, proofFile: file }));
      setFormErrors(prev => ({ ...prev, proofFile: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    // Amount validation
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      errors.amount = 'Amount must be greater than 0';
    }
    if (amount > parseFloat(selectedDemand.balanceAmount || 0)) {
      errors.amount = 'Amount cannot exceed balance amount';
    }

    // Account holder name validation
    if (!paymentForm.accountHolderName || paymentForm.accountHolderName.trim().length < 3) {
      errors.accountHolderName = 'Account holder name must be at least 3 characters';
    }

    // Payment mode validation
    if (!paymentForm.paymentMode) {
      errors.paymentMode = 'Payment mode is required';
    }

    // Conditional validations
    if (['CASH', 'CHEQUE', 'CARD'].includes(paymentForm.paymentMode) && !paymentForm.proofFile) {
      errors.proofFile = 'Proof upload is required for offline payments';
    }

    if (paymentForm.paymentMode === 'CHEQUE') {
      if (!paymentForm.chequeNumber) {
        errors.chequeNumber = 'Cheque number is required';
      }
      if (!paymentForm.chequeDate) {
        errors.chequeDate = 'Cheque date is required';
      }
      if (!paymentForm.bankName) {
        errors.bankName = 'Bank name is required';
      }
    }

    if (['CARD', 'ONLINE'].includes(paymentForm.paymentMode) && !paymentForm.transactionId) {
      errors.transactionId = 'Transaction ID is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      let proofUrl = null;

      // Upload proof if required (for offline payments)
      if (['CASH', 'CHEQUE', 'CARD'].includes(paymentForm.paymentMode) && paymentForm.proofFile) {
        setUploadingProof(true);
        const formData = new FormData();
        formData.append('proof', paymentForm.proofFile);
        
        const uploadResponse = await uploadAPI.uploadPaymentProof(formData);
        proofUrl = uploadResponse.data.data.url;
      }

      // Create payment
      const paymentData = {
        demandId: selectedDemand.id,
        amount: parseFloat(paymentForm.amount),
        paymentMode: paymentForm.paymentMode.toLowerCase(), // Convert to lowercase
        paymentDate: new Date().toISOString(),
        chequeNumber: paymentForm.chequeNumber,
        chequeDate: paymentForm.chequeDate,
        bankName: paymentForm.bankName,
        transactionId: paymentForm.transactionId,
        accountHolderName: paymentForm.accountHolderName, // Add account holder name
        proofUrl,
        remarks: `Field collection by ${user?.firstName || user?.full_name || 'Collector'}`
      };

      const response = await paymentAPI.createFieldCollection(paymentData);
      
      if (response.data.success) {
        toast.success('Payment recorded successfully');
        closePaymentModal();
        fetchTaxSummary(); // Refresh the data
        
        // Generate receipt
        try {
          await paymentAPI.generateReceiptPdf(response.data.data.payment.id);
          toast.success('Receipt generated successfully');
        } catch (pdfError) {
          console.error('Error generating receipt:', pdfError);
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setUploadingProof(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tax Summary</h1>
        <p className="text-gray-600 mt-1">Unified tax demands for field collection</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Unified Demands</h3>
        
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading tax summary...</p>
          </div>
        ) : demands.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No unified tax demands found
          </div>
        ) : (
          <div className="space-y-4">
            {demands.map((demand) => (
              <div key={demand.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium">{demand.demandNumber}</h4>
                    <p className="text-sm text-gray-600">
                      {demand.property?.propertyNumber} - {demand.property?.address}
                    </p>
                    <p className="text-sm text-gray-600">
                      Owner: {demand.property?.owner?.firstName} {demand.property?.owner?.lastName}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN')}</div>
                    <div className="text-sm text-gray-500">Balance</div>
                    <div className="text-sm text-blue-600">{demand.status}</div>
                    <button
                      onClick={() => openPaymentModal(demand)}
                      disabled={demand.status === 'paid' || parseFloat(demand.balanceAmount || 0) <= 0}
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Collect Payment
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedDemand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Collect Payment</h3>
              <button
                onClick={closePaymentModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded">
              <h4 className="font-medium">{selectedDemand.demandNumber}</h4>
              <p className="text-sm text-gray-600">{selectedDemand.property?.address}</p>
              <p className="text-sm text-gray-600">
                Owner: {selectedDemand.property?.owner?.firstName} {selectedDemand.property?.owner?.lastName}
              </p>
              <div className="mt-2">
                <span className="text-sm text-gray-500">Total Payable: </span>
                <span className="font-medium">₹{parseFloat(selectedDemand.totalAmount || 0).toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-sm text-gray-500">Current Balance: </span>
                <span className="font-medium">₹{parseFloat(selectedDemand.balanceAmount || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <form onSubmit={handleSubmitPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Mode *
                </label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) => handleFormChange('paymentMode', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CARD">Card</option>
                  <option value="ONLINE">Online</option>
                </select>
                {formErrors.paymentMode && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.paymentMode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={paymentForm.amount}
                  onChange={(e) => handleFormChange('amount', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.amount && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.amount}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Holder Name *
                </label>
                <input
                  type="text"
                  value={paymentForm.accountHolderName}
                  onChange={(e) => handleFormChange('accountHolderName', e.target.value)}
                  placeholder="Enter account holder name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {formErrors.accountHolderName && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.accountHolderName}</p>
                )}
              </div>

              {paymentForm.paymentMode === 'CHEQUE' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cheque Number *
                    </label>
                    <input
                      type="text"
                      value={paymentForm.chequeNumber}
                      onChange={(e) => handleFormChange('chequeNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formErrors.chequeNumber && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.chequeNumber}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cheque Date *
                    </label>
                    <input
                      type="date"
                      value={paymentForm.chequeDate}
                      onChange={(e) => handleFormChange('chequeDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formErrors.chequeDate && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.chequeDate}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      value={paymentForm.bankName}
                      onChange={(e) => handleFormChange('bankName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {formErrors.bankName && (
                      <p className="text-red-500 text-sm mt-1">{formErrors.bankName}</p>
                    )}
                  </div>
                </>
              )}

              {['CARD', 'ONLINE'].includes(paymentForm.paymentMode) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Transaction ID *
                  </label>
                  <input
                    type="text"
                    value={paymentForm.transactionId}
                    onChange={(e) => handleFormChange('transactionId', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  {formErrors.transactionId && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.transactionId}</p>
                  )}
                </div>
              )}

              {['CASH', 'CHEQUE', 'CARD'].includes(paymentForm.paymentMode) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Proof * (Required for offline payments)
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="proof-upload"
                      required
                    />
                    <label
                      htmlFor="proof-upload"
                      className="flex flex-col items-center cursor-pointer"
                    >
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-600">
                        {paymentForm.proofFile ? paymentForm.proofFile.name : 'Click to upload proof'}
                      </span>
                    </label>
                  </div>
                  {formErrors.proofFile && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.proofFile}</p>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingProof}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  {uploadingProof ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Collect Payment
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxSummarySimple;
