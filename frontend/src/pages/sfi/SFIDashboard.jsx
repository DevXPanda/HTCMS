import React from 'react';
import { Link } from 'react-router-dom';
import { Bath, Recycle, Heart, Users } from 'lucide-react';

const SFIDashboard = () => {
  const modules = [
    { to: '/sfi/toilet-management', label: 'Toilet Management', icon: Bath, description: 'Facilities, inspections, complaints, maintenance' },
    { to: '/sfi/mrf', label: 'MRF', icon: Recycle, description: 'Facilities, waste entries, worker assignment, tasks' },
    { to: '/sfi/gaushala/management', label: 'Gaushala', icon: Heart, description: 'Facilities, cattle, inspections, feeding, complaints' },
    { to: '/sfi/workers', label: 'Worker Management', icon: Users, description: 'Field workers, attendance, payroll' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SFI Dashboard</h1>
        <p className="text-gray-600 mt-1">Sanitary & Food Inspector — Toilet, MRF, Gaushala & Worker Management</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {modules.map(({ to, label, icon: Icon, description }) => (
          <Link
            key={to}
            to={to}
            className="block p-6 bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md hover:border-primary-200 transition-all"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-lg bg-primary-100 flex items-center justify-center text-primary-600">
                <Icon className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
            </div>
            <p className="text-sm text-gray-500">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SFIDashboard;
