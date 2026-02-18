import React from 'react';
import { Link } from 'react-router-dom';
import { 
  Bath, 
  MapPin, 
  ClipboardCheck, 
  AlertCircle, 
  Wrench, 
  BarChart3, 
  Users,
  PlusCircle,
  FileText,
  Calendar
} from 'lucide-react';

const ToiletManagementModule = () => {
    const modules = [
        {
            title: 'Toilet Facilities',
            description: 'View and manage all public toilet facilities',
            icon: Bath,
            link: '/toilet-management/facilities',
            color: 'bg-pink-500'
        },
        {
            title: 'Inspections',
            description: 'Schedule and track toilet inspections',
            icon: ClipboardCheck,
            link: '/toilet-management/inspections',
            color: 'bg-blue-500'
        },
        {
            title: 'Complaints',
            description: 'Manage citizen complaints and feedback',
            icon: AlertCircle,
            link: '/toilet-management/complaints',
            color: 'bg-red-500'
        },
        {
            title: 'Maintenance',
            description: 'Schedule and track maintenance activities',
            icon: Wrench,
            link: '/toilet-management/maintenance',
            color: 'bg-orange-500'
        },
        {
            title: 'Staff Assignment',
            description: 'Assign staff to toilet facilities',
            icon: Users,
            link: '/toilet-management/staff',
            color: 'bg-green-500'
        },
        {
            title: 'Reports & Analytics',
            description: 'View reports and analytics',
            icon: BarChart3,
            link: '/toilet-management/reports',
            color: 'bg-purple-500'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Toilet Management Module</h1>
                    <p className="text-gray-600">Manage all public toilet facilities and operations</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {modules.map((module, index) => (
                    <Link
                        key={index}
                        to={module.link}
                        className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6"
                    >
                        <div className="flex items-center space-x-4">
                            <div className={`p-3 rounded-full ${module.color} text-white`}>
                                <module.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                                <p className="text-sm text-gray-500">{module.description}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="bg-white rounded-lg shadow p-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="flex flex-wrap gap-4">
                    <Link 
                        to="/toilet-management/facilities/new" 
                        className="btn btn-primary flex items-center"
                    >
                        <PlusCircle className="h-4 w-4 mr-2" /> Add New Toilet Facility
                    </Link>
                    <Link 
                        to="/toilet-management/inspections/new" 
                        className="btn btn-secondary flex items-center"
                    >
                        <ClipboardCheck className="h-4 w-4 mr-2" /> Schedule Inspection
                    </Link>
                    <Link 
                        to="/toilet-management/maintenance/new" 
                        className="btn btn-secondary flex items-center"
                    >
                        <Wrench className="h-4 w-4 mr-2" /> Schedule Maintenance
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default ToiletManagementModule;
