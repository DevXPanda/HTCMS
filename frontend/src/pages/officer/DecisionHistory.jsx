import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Droplets, 
  CheckCircle, 
  XCircle, 
  Calendar,
  User,
  Eye
} from 'lucide-react';
import api from '../../services/api';

const DecisionHistory = () => {
  const [history, setHistory] = useState({ propertyDecisions: [], waterDecisions: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('property');

  useEffect(() => {
    fetchDecisionHistory();
  }, []);

  const fetchDecisionHistory = async () => {
    try {
      const response = await api.get('/officer/decisions/history');
      setHistory(response.data);
    } catch (error) {
      console.error('Error fetching decision history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Decision History</h1>
        <p className="text-gray-600 mt-2">View your past decisions on escalated applications</p>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('property')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'property'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="h-4 w-4 mr-2 inline" />
            Property Applications ({history.propertyDecisions.length})
          </button>
          <button
            onClick={() => setActiveTab('water')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'water'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Droplets className="h-4 w-4 mr-2 inline" />
            Water Requests ({history.waterDecisions.length})
          </button>
        </nav>
      </div>

      {activeTab === 'property' && (
        <div className="space-y-4">
          {history.propertyDecisions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Property Decisions</h3>
                <p className="text-gray-500">You haven't made any decisions on property applications yet.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {history.propertyDecisions.map((decision) => (
                <div key={decision.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between pb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      {decision.applicationNumber}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${
                        decision.status === 'APPROVED' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {decision.status === 'APPROVED' ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1 inline" />
                            Approved
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1 inline" />
                            Rejected
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Owner:</span>
                        <p>{decision.ownerName}</p>
                      </div>
                      <div>
                        <span className="font-medium">Property Type:</span>
                        <p>{decision.propertyType}</p>
                      </div>
                      <div>
                        <span className="font-medium">Decision Date:</span>
                        <p>{new Date(decision.decidedAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium">Application:</span>
                        <p>{decision.applicant?.firstName} {decision.applicant?.lastName}</p>
                      </div>
                    </div>
                    
                    {decision.officerRemarks && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="font-medium text-sm mb-1">Your Remarks:</p>
                        <p className="text-sm text-gray-700">{decision.officerRemarks}</p>
                      </div>
                    )}

                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      Decided on {new Date(decision.decidedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'water' && (
        <div className="space-y-4">
          {history.waterDecisions.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="text-center py-8">
                <Droplets className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Water Request Decisions</h3>
                <p className="text-gray-500">You haven't made any decisions on water connection requests yet.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {history.waterDecisions.map((decision) => (
                <div key={decision.id} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center justify-between pb-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Droplets className="h-5 w-5" />
                      {decision.requestNumber}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2.5 py-0.5 rounded ${
                        decision.status === 'APPROVED' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {decision.status === 'APPROVED' ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1 inline" />
                            Approved
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1 inline" />
                            Rejected
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Applicant:</span>
                        <p>{decision.requester?.firstName} {decision.requester?.lastName}</p>
                      </div>
                      <div>
                        <span className="font-medium">Connection Type:</span>
                        <p>{decision.connectionType}</p>
                      </div>
                      <div>
                        <span className="font-medium">Decision Date:</span>
                        <p>{new Date(decision.decidedAt).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <span className="font-medium">Property Location:</span>
                        <p>{decision.propertyLocation}</p>
                      </div>
                    </div>
                    
                    {decision.officerRemarks && (
                      <div className="mt-3 p-3 bg-gray-50 rounded">
                        <p className="font-medium text-sm mb-1">Your Remarks:</p>
                        <p className="text-sm text-gray-700">{decision.officerRemarks}</p>
                      </div>
                    )}

                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      Decided on {new Date(decision.decidedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DecisionHistory;
