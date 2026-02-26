import { useState, useEffect } from 'react';
import { noticeAPI, demandAPI } from '../../../services/api';
import toast from 'react-hot-toast';
import { X, Loader } from 'lucide-react';

const GenerateNoticeModal = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [demands, setDemands] = useState([]);
  const [searchDemand, setSearchDemand] = useState('');
  const [formData, setFormData] = useState({
    demandId: '',
    noticeType: 'reminder',
    dueDate: '',
    remarks: ''
  });

  useEffect(() => {
    fetchDemands();
  }, [searchDemand]);

  const fetchDemands = async () => {
    try {
      const params = {
        status: 'pending',
        balanceAmount: { gt: 0 },
        limit: 20
      };
      if (searchDemand) {
        params.search = searchDemand;
      }
      const response = await demandAPI.getAll(params);
      setDemands(response.data.data.demands);
    } catch (error) {
      console.error('Failed to fetch demands:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.demandId) {
      toast.error('Please select a demand');
      return;
    }

    if (!formData.noticeType) {
      toast.error('Please select notice type');
      return;
    }

    try {
      setLoading(true);
      await noticeAPI.generate(formData);
      toast.success('Notice generated successfully');
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to generate notice');
    } finally {
      setLoading(false);
    }
  };

  const selectedDemand = demands.find(d => d.id === parseInt(formData.demandId));

  return (
    <div className="modal-overlay">
      <div className="modal-panel modal-panel-lg max-w-2xl">
        <div className="modal-header">
          <h2 className="modal-title">Generate Notice</h2>
          <button type="button" onClick={onClose} className="modal-close" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <div className="space-y-4">
            {/* Demand Selection */}
            <div>
              <label className="label">Select Demand *</label>
              <input
                type="text"
                value={searchDemand}
                onChange={(e) => setSearchDemand(e.target.value)}
                placeholder="Search by demand number..."
                className="input mb-2"
              />
              <select
                value={formData.demandId}
                onChange={(e) => setFormData({ ...formData, demandId: e.target.value })}
                className="input"
                required
              >
                <option value="">Select a demand</option>
                {demands.map((demand) => (
                  <option key={demand.id} value={demand.id}>
                    {demand.demandNumber} - {demand.property?.propertyNumber} - 
                    Balance: ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </option>
                ))}
              </select>
              {selectedDemand && (
                <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                  <p><strong>Property:</strong> {selectedDemand.property?.propertyNumber}</p>
                  <p><strong>Owner:</strong> {selectedDemand.property?.owner?.firstName} {selectedDemand.property?.owner?.lastName}</p>
                  <p><strong>Balance Amount:</strong> ₹{parseFloat(selectedDemand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                  <p><strong>Due Date:</strong> {new Date(selectedDemand.dueDate).toLocaleDateString()}</p>
                </div>
              )}
            </div>

            {/* Notice Type */}
            <div>
              <label className="label">Notice Type *</label>
              <select
                value={formData.noticeType}
                onChange={(e) => setFormData({ ...formData, noticeType: e.target.value })}
                className="input"
                required
              >
                <option value="reminder">Reminder Notice</option>
                <option value="demand">Demand Notice</option>
                <option value="penalty">Penalty Notice</option>
                <option value="final_warrant">Final Warrant Notice</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Note: Escalation rules apply. First notice must be Reminder or Demand.
              </p>
            </div>

            {/* Due Date */}
            <div>
              <label className="label">Due Date</label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="input"
                min={selectedDemand ? new Date(selectedDemand.dueDate).toISOString().split('T')[0] : ''}
              />
              <p className="text-xs text-gray-500 mt-1">
                Leave empty to use demand due date
              </p>
            </div>

            {/* Remarks */}
            <div>
              <label className="label">Remarks</label>
              <textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="input"
                rows="3"
                placeholder="Additional notes or remarks..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate Notice'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GenerateNoticeModal;
