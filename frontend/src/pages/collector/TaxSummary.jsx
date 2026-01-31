import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { demandAPI, paymentAPI, uploadAPI, wardAPI } from '../../services/api';
import { 
  Search, 
  Filter, 
  Calendar, 
  MapPin, 
  CreditCard, 
  Eye,
  Download,
  Upload,
  X,
  Check
} from 'lucide-react';

const TaxSummary = () => {
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    ward: '',
    status: '',
    dueDate: '',
    search: ''
  });
  const [wards, setWards] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentMode: 'cash',
    chequeNumber: '',
    chequeDate: '',
    bankName: '',
    transactionId: '',
    proofFile: null
  });
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    fetchTaxSummary();
    fetchWards();
  }, [filters]);

  const fetchTaxSummary = async () => {
    try {
      setLoading(true);
      const params = {};
      
      // Only get unified demands
      params.remarks = 'UNIFIED_DEMAND';
      
      if (filters.ward) params.wardId = filters.ward;
      if (filters.status) params.status = filters.status;
      if (filters.dueDate) params.dueDate = filters.dueDate;
      if (filters.search) params.search = filters.search;
      
      // For collectors, only show demands from their assigned wards
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('Current user:', user);
      
      if (user.role === 'collector' || user.role === 'tax_collector') {
        // This will be filtered on backend based on collector's assigned wards
        params.collectorId = user.id;
      }

      console.log('Fetching demands with params:', params);
      const response = await demandAPI.getAll(params);
      console.log('Demands response:', response.data);
      
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

  const fetchWards = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      console.log('Fetching wards for user:', user);
      
      if (user.role === 'collector' || user.role === 'tax_collector') {
        // Get collector's assigned wards
        const response = await wardAPI.getByCollector(user.id);
        console.log('Collector wards response:', response.data);
        if (response.data.success) {
          setWards(response.data.data);
        }
      } else {
        // Get all wards for admin
        const response = await wardAPI.getAll();
        console.log('All wards response:', response.data);
        if (response.data.success) {
          setWards(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error fetching wards:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      ward: '',
      status: '',
      dueDate: '',
      search: ''
    });
  };

  const getDemandBreakdown = (demand) => {
    try {
      const remarks = typeof demand.remarks === 'string' ? demand.remarks : '{}';
      const parsed = JSON.parse(remarks);
      return parsed.breakdown || {};
    } catch {
      return {};
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      overdue: 'bg-red-100 text-red-800',
      partially_paid: 'bg-blue-100 text-blue-800',
      paid: 'bg-green-100 text-green-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const openPaymentModal = (demand) => {
    setSelectedDemand(demand);
    setPaymentForm({
      amount: demand.balanceAmount,
      paymentMode: 'cash',
      chequeNumber: '',
      chequeDate: '',
      bankName: '',
      transactionId: '',
      proofFile: null
    });
    setShowPaymentModal(true);
  };

  const closePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedDemand(null);
    setPaymentForm({
      amount: '',
      paymentMode: 'cash',
      chequeNumber: '',
      chequeDate: '',
      bankName: '',
      transactionId: '',
      proofFile: null
    });
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedDemand) return;

    try {
      let proofUrl = null;

      // Upload proof if required (for offline payments)
      if (paymentForm.paymentMode !== 'online' && paymentForm.proofFile) {
        setUploadingProof(true);
        const formData = new FormData();
        formData.append('proof', paymentForm.proofFile);
        
        const uploadResponse = await uploadAPI.uploadPaymentProof(formData);
        proofUrl = uploadResponse.data.data.url;
      }

      // Validate proof requirement for offline payments
      if (paymentForm.paymentMode !== 'online' && !proofUrl) {
        toast.error('Proof upload is mandatory for offline payments');
        return;
      }

      // Create payment
      const paymentData = {
        demandId: selectedDemand.id,
        amount: paymentForm.amount,
        paymentMode: paymentForm.paymentMode,
        paymentDate: new Date().toISOString(),
        chequeNumber: paymentForm.chequeNumber,
        chequeDate: paymentForm.chequeDate,
        bankName: paymentForm.bankName,
        transactionId: paymentForm.transactionId,
        proofUrl,
        remarks: `Field collection by ${JSON.parse(localStorage.getItem('user')).firstName}`
      };

      const response = await paymentAPI.createFieldCollection(paymentData);
      
      if (response.data.success) {
        toast.success('Payment collected successfully');
        closePaymentModal();
        fetchTaxSummary(); // Refresh the data
        
        // Generate receipt
        try {
          await paymentAPI.generateReceiptPdf(response.data.data.payment.id);
          toast.success('Receipt generated successfully');
        } catch (receiptError) {
          console.error('Error generating receipt:', receiptError);
        }
      }
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error(error.response?.data?.message || 'Failed to process payment');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Only JPG, PNG, and PDF files are allowed');
        return;
      }
      
      setPaymentForm(prev => ({ ...prev, proofFile: file }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tax Summary</h1>
          <p className="text-gray-600 mt-1">Unified tax demands for field collection</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900 flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </h3>
          <button
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Property, Owner, Demand..."
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Ward */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="inline w-4 h-4 mr-1" />
              Ward
            </label>
            <select
              value={filters.ward}
              onChange={(e) => handleFilterChange('ward', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Wards</option>
              {wards.map(ward => (
                <option key={ward.id} value={ward.id}>
                  {ward.wardNumber} - {ward.wardName}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="overdue">Overdue</option>
              <option value="partially_paid">Partially Paid</option>
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="inline w-4 h-4 mr-1" />
              Due Date
            </label>
            <input
              type="date"
              value={filters.dueDate}
              onChange={(e) => handleFilterChange('dueDate', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Demands Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Owner
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Property Tax
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Water Tax
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Penalty
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Payable
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Due Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                    <p className="mt-2 text-gray-500">Loading tax summary...</p>
                  </td>
                </tr>
              ) : demands.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-gray-500">
                    No unified tax demands found
                  </td>
                </tr>
              ) : (
                demands.map((demand) => {
                  const breakdown = getDemandBreakdown(demand);
                  return (
                    <tr key={demand.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {demand.property?.propertyNumber}
                        </div>
                        <div className="text-sm text-gray-500">
                          {demand.property?.address}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {demand.property?.owner?.firstName} {demand.property?.owner?.lastName}
                        </div>
                        <div className="text-sm text-gray-500">
                          {demand.property?.owner?.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(breakdown.propertyTax?.subtotalAmount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(breakdown.waterTax?.subtotalAmount || 0)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(
                          (parseFloat(demand.penaltyAmount || 0) + parseFloat(demand.interestAmount || 0))
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(demand.balanceAmount)}
                        </div>
                        {parseFloat(demand.paidAmount) > 0 && (
                          <div className="text-xs text-green-600">
                            Paid: {formatCurrency(demand.paidAmount)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(demand.dueDate).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(demand.status)}`}>
                          {demand.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {parseFloat(demand.balanceAmount) > 0 && (
                            <button
                              onClick={() => openPaymentModal(demand)}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              <CreditCard className="w-4 h-4 mr-1" />
                              Collect
                            </button>
                          )}
                          <button
                            onClick={() => window.open(`/collector/demands/${demand.id}`, '_blank')}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Collection Modal */}
      {showPaymentModal && selectedDemand && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex justify-between items-center p-6 border-b">
              <h3 className="text-lg font-medium text-gray-900">Collect Payment</h3>
              <button
                onClick={closePaymentModal}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
              {/* Demand Info */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-sm font-medium text-gray-900">
                  {selectedDemand.property?.propertyNumber}
                </div>
                <div className="text-sm text-gray-600">
                  {selectedDemand.property?.owner?.firstName} {selectedDemand.property?.owner?.lastName}
                </div>
                <div className="text-lg font-bold text-gray-900 mt-2">
                  Due Amount: {formatCurrency(selectedDemand.balanceAmount)}
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Collection Amount *
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  required
                />
                {parseFloat(paymentForm.amount) > parseFloat(selectedDemand.balanceAmount) && (
                  <p className="text-red-500 text-sm mt-1">Amount cannot exceed due amount</p>
                )}
              </div>

              {/* Payment Mode */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Mode *
                </label>
                <select
                  value={paymentForm.paymentMode}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, paymentMode: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                  <option value="card">Card</option>
                  <option value="online">Online</option>
                </select>
              </div>

              {/* Cheque Details */}
              {paymentForm.paymentMode === 'cheque' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cheque Number *
                    </label>
                    <input
                      type="text"
                      value={paymentForm.chequeNumber}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, chequeNumber: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cheque Date *
                    </label>
                    <input
                      type="date"
                      value={paymentForm.chequeDate}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, chequeDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      value={paymentForm.bankName}
                      onChange={(e) => setPaymentForm(prev => ({ ...prev, bankName: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </>
              )}

              {/* Transaction ID for Card/Online */}
              {(paymentForm.paymentMode === 'card' || paymentForm.paymentMode === 'online') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transaction ID *
                  </label>
                  <input
                    type="text"
                    value={paymentForm.transactionId}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, transactionId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              )}

              {/* Proof Upload (for offline payments) */}
              {paymentForm.paymentMode !== 'online' && (
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
                      <span className="text-xs text-gray-500 mt-1">
                        JPG, PNG, PDF (max 5MB)
                      </span>
                    </label>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closePaymentModal}
                  className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingProof || parseFloat(paymentForm.amount) > parseFloat(selectedDemand.balanceAmount)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
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

export default TaxSummary;
