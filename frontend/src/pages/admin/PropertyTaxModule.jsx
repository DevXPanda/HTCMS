import React from 'react';
import { Link } from 'react-router-dom';
import { Home, FileText, Receipt, Bell, CreditCard, PlusCircle } from 'lucide-react';

const PropertyTaxModule = () => {
    const modules = [
        {
            title: 'Properties',
            description: 'Manage property records and details',
            icon: Home,
            link: '/properties',
            color: 'bg-blue-500'
        },
        {
            title: 'Assessments',
            description: 'View and manage property tax assessments',
            icon: FileText,
            link: '/assessments',
            color: 'bg-green-500'
        },
        {
            title: 'Demands',
            description: 'Track tax demands and collections',
            icon: Receipt,
            link: '/demands',
            color: 'bg-yellow-500'
        },
        {
            title: 'Notices',
            description: 'Issue and manage legal notices',
            icon: Bell,
            link: '/notices',
            color: 'bg-red-500'
        },
        {
            title: 'Payments',
            description: 'Record and track tax payments',
            icon: CreditCard,
            link: '/payments',
            color: 'bg-purple-500'
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Property Tax Module</h1>
                    <p className="text-gray-600">Manage all property tax related activities</p>
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
                    <Link to="/properties/new" className="btn btn-primary flex items-center">
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Property
                    </Link>
                    <Link to="/assessments/new" className="btn btn-outline btn-secondary flex items-center">
                        <PlusCircle className="h-4 w-4 mr-2" /> New Assessment
                    </Link>
                </div>
            </div>

        </div>
    );
};

export default PropertyTaxModule;
