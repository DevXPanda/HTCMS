import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, FileText } from 'lucide-react';
import { useStaffAuth } from '../../contexts/StaffAuthContext';
import D2DCLayout from '../admin/d2dc/D2DCLayout';

const SBMD2DCModule = () => {
  const { user } = useStaffAuth();
  const canCrud = Boolean(user?.full_crud_enabled);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="ds-page-title">D2DC Module</h1>
          <p className="ds-page-subtitle">Door-to-door collection and field monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          {canCrud && (
            <Link
              to="/sbm/demands/generate/d2dc"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
            >
              Generate D2DC Demands
            </Link>
          )}
          <Link
            to="/sbm/demands?module=D2DC"
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
          >
            <FileText className="w-4 h-4" /> View D2DC Demands
          </Link>
          <div className="p-3 bg-purple-100 rounded-full">
            <Truck className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>

      <div className="min-h-[600px]">
        <D2DCLayout />
      </div>
    </div>
  );
};

export default SBMD2DCModule;
