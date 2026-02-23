import React from 'react';
import { Link } from 'react-router-dom';
import { Droplet, FileText, Receipt, ClipboardList, CreditCard, PlusCircle } from 'lucide-react';

const WaterTaxModule = () => {
    const modules = [
        {
            title: 'Water Connections',
            description: 'Manage water connection records',
            icon: Droplet,
            link: '/water/connections',
            color: 'bg-blue-500'
        },
        {
            title: 'Assessments',
            description: 'View and manage water tax assessments',
            icon: FileText,
            link: '/water/assessments',
            color: 'bg-green-500'
        },
        {
            title: 'Water Bills',
            description: 'Track water bills and demands',
            icon: Receipt,
            link: '/water/bills',
            color: 'bg-yellow-500'
        },
        {
            title: 'Demands',
            description: 'View and manage water tax demands',
            icon: Receipt,
            link: '/demands?module=WATER',
            color: 'bg-amber-500'
        },
        {
            title: 'Connection Requests',
            description: 'Manage new connection applications',
            icon: ClipboardList,
            link: '/water/connection-requests',
            color: 'bg-orange-500'
        },
        {
            title: 'Payments',
            description: 'Record and track water payments',
            icon: CreditCard,
            link: '/water/payments',
            color: 'bg-purple-500'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Water Tax Module</h1>
                    <p className="text-gray-600">Manage all water tax related activities</p>
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
                    <Link to="/water/assessments/new" className="btn btn-primary flex items-center">
                        <PlusCircle className="h-4 w-4 mr-2" /> New Assessment
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default WaterTaxModule;
