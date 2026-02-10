import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useStaffAuth } from '../../../contexts/StaffAuthContext';
import CollectorDashboard from './CollectorDashboard';
import InspectorDashboard from './InspectorDashboard';


const D2DCLayout = () => {
    const { user: authUser } = useAuth();
    const { user: staffUser } = useStaffAuth();

    const user = authUser || staffUser;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    const renderDashboard = () => {
        switch (user.role) {
            case 'collector':
            case 'tax_collector':
                return <CollectorDashboard />;
            case 'inspector':
            case 'admin':
                // Admin sees what Inspector sees (Monitoring View)
                return <InspectorDashboard />;
            default:
                return (
                    <div className="p-8 text-center bg-gray-50 rounded-lg">
                        <h2 className="text-xl font-bold text-red-600 mb-2">Access Denied</h2>
                        <p className="text-gray-600">You do not have permission to access the D2DC module.</p>
                    </div>
                );
        }
    };

    return (
        <div className="h-full w-full">

            {renderDashboard()}
        </div>
    );
};

export default D2DCLayout;
