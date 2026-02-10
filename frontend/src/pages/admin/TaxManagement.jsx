import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Droplet, Store, Truck, ArrowLeft, Zap } from 'lucide-react';

const TaxManagement = () => {
    const taxModules = [
        {
            name: 'Property Tax',
            description: 'Manage property assessments, demands, and payments',
            icon: Building2,
            link: '/property-tax',
            color: 'bg-blue-600',
            bgColor: 'bg-blue-50',
            borderColor: 'border-blue-100',
            textColor: 'text-blue-700'
        },
        {
            name: 'Water Tax',
            description: 'Handle water connections, consumers, and billing',
            icon: Droplet,
            link: '/water-tax',
            color: 'bg-cyan-600',
            bgColor: 'bg-cyan-50',
            borderColor: 'border-cyan-100',
            textColor: 'text-cyan-700'
        },
        {
            name: 'Shop Tax',
            description: 'Generate and manage demands for shops',
            icon: Store,
            link: '/demands/generate',
            color: 'bg-yellow-600',
            bgColor: 'bg-yellow-50',
            borderColor: 'border-yellow-100',
            textColor: 'text-yellow-700'
        },
        {
            name: 'D2DC',
            description: 'Door-to-door collection and field monitoring',
            icon: Truck,
            link: '/tax-management/d2dc',
            color: 'bg-purple-600',
            bgColor: 'bg-purple-50',
            borderColor: 'border-purple-100',
            textColor: 'text-purple-700'
        },
        {
            name: 'Unified Tax Demand',
            description: 'Generate Property, Water & D2DC demands in one go',
            icon: Zap,
            link: '/demands/unified',
            color: 'bg-gradient-to-r from-indigo-600 to-purple-600',
            bgColor: 'bg-indigo-50',
            borderColor: 'border-indigo-100',
            textColor: 'text-indigo-700'
        }
    ];

    return (
        <div className="space-y-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Link to="/dashboard" className="text-gray-400 hover:text-gray-600 transition-colors">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-gray-900">Tax Management</h1>
                    </div>
                    <p className="text-gray-500 text-sm ml-7">Select a tax module to proceed</p>
                </div>
            </div>

            {/* Modules Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {taxModules.map((module, index) => (
                    <Link
                        key={index}
                        to={module.link}
                        className={`flex items-start p-6 rounded-xl border ${module.borderColor} bg-white shadow-sm hover:shadow-md transition-all group relative overflow-hidden`}
                    >
                        {/* Background Decoration */}
                        <div className={`absolute -right-6 -top-6 w-24 h-24 rounded-full ${module.bgColor} opacity-50 group-hover:scale-150 transition-transform duration-500 ease-out`} />

                        <div className={`p-4 rounded-lg ${module.color} text-white shadow-sm mr-5 relative z-10`}>
                            <module.icon className="h-8 w-8" />
                        </div>

                        <div className="flex-1 relative z-10">
                            <h3 className="text-lg font-bold text-gray-900 group-hover:text-primary-600 transition-colors mb-2">
                                {module.name}
                            </h3>
                            <p className="text-gray-500 text-sm leading-relaxed">
                                {module.description}
                            </p>
                            <div className={`mt-4 inline-flex items-center text-sm font-medium ${module.textColor}`}>
                                Access Module &rarr;
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default TaxManagement;
