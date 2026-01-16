import { useState, useEffect } from 'react';
import { fieldVisitAPI } from '../../../services/api';
import Loading from '../../../components/Loading';
import toast from 'react-hot-toast';
import { X, MapPin, User, Building, DollarSign, Calendar, Smartphone, 
         CheckCircle, XCircle, AlertTriangle, FileText, Shield } from 'lucide-react';

const FieldVisitDetailsModal = ({ visitId, isOpen, onClose }) => {
  const [visitDetails, setVisitDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && visitId) {
      fetchVisitDetails();
    }
  }, [isOpen, visitId]);

  const fetchVisitDetails = async () => {
    try {
      setLoading(true);
      const response = await fieldVisitAPI.getAdminDetails(visitId);
      setVisitDetails(response.data.data.visitDetails);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch visit details');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatCurrency = (amount) => {
    return `₹${parseFloat(amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  const getCitizenResponseLabel = (response) => {
    const labels = {
      'will_pay_today': 'Will Pay Today',
      'will_pay_later': 'Will Pay Later',
      'refused_to_pay': 'Refused to Pay',
      'not_available': 'Not Available'
    };
    return labels[response] || response;
  };

  const getVisitTypeLabel = (type) => {
    const labels = {
      'reminder': 'Reminder',
      'payment_collection': 'Payment Collection',
      'warning': 'Warning',
      'final_warning': 'Final Warning'
    };
    return labels[type] || type;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Field Visit Details</h2>
            <p className="text-sm text-gray-500 mt-1">
              Visit Number: {visitDetails?.visitNumber || 'Loading...'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <Loading />
          ) : visitDetails ? (
            <div className="space-y-6">
              {/* Visit Summary */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Visit Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Visit Type</p>
                    <p className="font-medium capitalize">
                      {getVisitTypeLabel(visitDetails.visitType)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sequence</p>
                    <p className="font-medium">#{visitDetails.visitSequenceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <span className={`px-2 py-1 text-xs rounded ${
                      visitDetails.status === 'verified' ? 'bg-green-100 text-green-800' :
                      visitDetails.status === 'flagged' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {visitDetails.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Visit Date</p>
                    <p className="font-medium text-sm">{formatDate(visitDetails.visitDate)}</p>
                  </div>
                </div>
              </div>

              {/* Collector Information */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Collector Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="font-medium">{visitDetails.collector.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-medium">{visitDetails.collector.email || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-medium">{visitDetails.collector.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Role</p>
                    <p className="font-medium capitalize">{visitDetails.collector.role}</p>
                  </div>
                </div>
              </div>

              {/* Attendance Snapshot */}
              {visitDetails.attendance && (
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Attendance Snapshot
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Login Time</p>
                      <p className="font-medium">{formatDate(visitDetails.attendance.loginAt)}</p>
                    </div>
                    {visitDetails.attendance.logoutAt && (
                      <div>
                        <p className="text-sm text-gray-500">Logout Time</p>
                        <p className="font-medium">{formatDate(visitDetails.attendance.logoutAt)}</p>
                      </div>
                    )}
                    {visitDetails.attendance.workingDurationMinutes && (
                      <div>
                        <p className="text-sm text-gray-500">Working Duration</p>
                        <p className="font-medium">{visitDetails.attendance.workingDurationMinutes} minutes</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <span className={`px-2 py-1 text-xs rounded ${
                        visitDetails.attendance.isWithinWindow ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {visitDetails.attendance.isWithinWindow ? 'Within Window' : 'Outside Window'}
                      </span>
                    </div>
                    {visitDetails.attendance.loginAddress && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Login Location</p>
                        <p className="font-medium">{visitDetails.attendance.loginAddress}</p>
                      </div>
                    )}
                    {visitDetails.attendance.loginLatitude && visitDetails.attendance.loginLongitude && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Login GPS Coordinates</p>
                        <p className="font-medium">
                          {visitDetails.attendance.loginLatitude}, {visitDetails.attendance.loginLongitude}
                        </p>
                      </div>
                    )}
                    {visitDetails.attendance.windowNote && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Note</p>
                        <p className="text-sm text-yellow-700">{visitDetails.attendance.windowNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Location Details */}
              {visitDetails.location.latitude && visitDetails.location.longitude && (
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Location Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Latitude</p>
                      <p className="font-medium">{visitDetails.location.latitude}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Longitude</p>
                      <p className="font-medium">{visitDetails.location.longitude}</p>
                    </div>
                    {visitDetails.location.address && (
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">{visitDetails.location.address}</p>
                      </div>
                    )}
                  </div>
                  {/* Map placeholder */}
                  <div className="mt-4 bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                    <p className="text-gray-500 text-sm">
                      Map view would be displayed here (Google Maps integration)
                    </p>
                  </div>
                </div>
              )}

              {/* Device & Network Metadata */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Smartphone className="w-5 h-5 mr-2" />
                  Device & Network Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Device Type</p>
                    <p className="font-medium capitalize">{visitDetails.device.deviceType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Browser</p>
                    <p className="font-medium">{visitDetails.device.browserName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Operating System</p>
                    <p className="font-medium">{visitDetails.device.operatingSystem || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">IP Address</p>
                    <p className="font-medium">{visitDetails.device.ipAddress}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Source</p>
                    <p className="font-medium capitalize">{visitDetails.device.source}</p>
                  </div>
                </div>
              </div>

              {/* Citizen & Property Context */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <User className="w-5 h-5 mr-2" />
                    Citizen Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Name</p>
                      <p className="font-medium">{visitDetails.citizen.name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium">{visitDetails.citizen.phone || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium">{visitDetails.citizen.email || 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <Building className="w-5 h-5 mr-2" />
                    Property Information
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Property Number</p>
                      <p className="font-medium">{visitDetails.property.propertyNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Address</p>
                      <p className="font-medium">{visitDetails.property.address}</p>
                    </div>
                    {visitDetails.property.ward && (
                      <div>
                        <p className="text-sm text-gray-500">Ward</p>
                        <p className="font-medium">
                          {visitDetails.property.ward.wardName} (Ward #{visitDetails.property.ward.wardNumber})
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Demand Context */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Tax Demand Context
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Demand Number</p>
                    <p className="font-medium">{visitDetails.demand.demandNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Financial Year</p>
                    <p className="font-medium">{visitDetails.demand.financialYear}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount Due</p>
                    <p className="font-medium text-red-600">{formatCurrency(visitDetails.demand.amountDue)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Overdue Days</p>
                    <p className="font-medium">{visitDetails.demand.overdueDays} days</p>
                  </div>
                </div>
                <div className="border-t pt-4">
                  <p className="text-sm font-semibold mb-2">Amount Breakdown</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Base Amount</p>
                      <p className="font-medium">{formatCurrency(visitDetails.demand.breakdown.baseAmount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Arrears</p>
                      <p className="font-medium">{formatCurrency(visitDetails.demand.breakdown.arrearsAmount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Penalty</p>
                      <p className="font-medium text-red-600">{formatCurrency(visitDetails.demand.breakdown.penaltyAmount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Interest</p>
                      <p className="font-medium text-red-600">{formatCurrency(visitDetails.demand.breakdown.interestAmount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total Amount</p>
                      <p className="font-medium">{formatCurrency(visitDetails.demand.breakdown.totalAmount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Paid Amount</p>
                      <p className="font-medium text-green-600">{formatCurrency(visitDetails.demand.breakdown.paidAmount)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Balance</p>
                      <p className="font-medium text-red-600">{formatCurrency(visitDetails.demand.breakdown.balanceAmount)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Collector Input */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4">Citizen Interaction</h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Citizen Response</p>
                    <p className="font-medium">{getCitizenResponseLabel(visitDetails.collectorInput.citizenResponse)}</p>
                  </div>
                  {visitDetails.collectorInput.expectedPaymentDate && (
                    <div>
                      <p className="text-sm text-gray-500">Expected Payment Date</p>
                      <p className="font-medium">{formatDate(visitDetails.collectorInput.expectedPaymentDate)}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-gray-500">Remarks</p>
                    <p className="font-medium whitespace-pre-wrap">{visitDetails.collectorInput.remarks}</p>
                  </div>
                  {visitDetails.collectorInput.proofPhotoUrl && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">Proof Photo</p>
                      <img
                        src={visitDetails.collectorInput.proofPhotoUrl}
                        alt="Proof photo"
                        className="w-full max-w-md rounded-lg border border-gray-200"
                        onError={(e) => {
                          e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                        }}
                      />
                    </div>
                  )}
                  {visitDetails.collectorInput.proofNote && (
                    <div>
                      <p className="text-sm text-gray-500">Proof Note</p>
                      <p className="font-medium">{visitDetails.collectorInput.proofNote}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* System Outcomes */}
              <div className="card">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Shield className="w-5 h-5 mr-2" />
                  System Actions & Escalation Status
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    {visitDetails.systemOutcomes.escalationTriggered ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium">Escalation Triggered</p>
                      <p className="text-sm text-gray-500">
                        Status: {visitDetails.systemOutcomes.currentEscalationStatus.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-500">
                        Level: {visitDetails.systemOutcomes.currentEscalationLevel}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {visitDetails.systemOutcomes.noticeGenerated ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium">Notice Generated</p>
                      <p className="text-sm text-gray-500">
                        {visitDetails.systemOutcomes.noticeTriggered ? 'Triggered' : 'Not triggered'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {visitDetails.systemOutcomes.nextFollowUpScheduled ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium">Next Follow-up Scheduled</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {visitDetails.systemOutcomes.isEnforcementEligible ? (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-gray-400" />
                    )}
                    <div>
                      <p className="font-medium">Enforcement Eligible</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Validation Flags */}
              {visitDetails.validation.flaggedReason && (
                <div className="card bg-yellow-50 border-yellow-200">
                  <h3 className="text-lg font-semibold mb-4 flex items-center text-yellow-800">
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    Validation Flags
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm font-medium text-yellow-800">Flagged Reason</p>
                      <p className="text-sm text-yellow-700">{visitDetails.validation.flaggedReason}</p>
                    </div>
                    {visitDetails.validation.attendanceWindowNote && (
                      <div>
                        <p className="text-sm font-medium text-yellow-800">Attendance Window Note</p>
                        <p className="text-sm text-yellow-700">{visitDetails.validation.attendanceWindowNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No visit details available</p>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FieldVisitDetailsModal;
