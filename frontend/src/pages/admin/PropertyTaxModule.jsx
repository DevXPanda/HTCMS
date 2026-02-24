import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, FileText, Receipt, Bell, CreditCard, PlusCircle, TrendingUp, AlertCircle, IndianRupee, CheckCircle } from 'lucide-react';
import api from '../../services/api';

const PropertyTaxModule = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchStats(); }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/reports/dashboard');
            if (response.data && response.data.success) {
                setStats(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch property tax stats:', error);
        } finally {
            setLoading(false);
        }
    };

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
            link: '/demands?module=PROPERTY',
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

    const fmt = (val) => parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 0 });
    const fmtCur = (val) => '₹' + parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Property Tax Module</h1>
                    <p className="text-gray-600">Manage all property tax related activities</p>
                </div>
            </div>

            {/* Summary Stats */}
            {!loading && stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Properties</p>
                                <p className="text-xl font-bold text-gray-900">{fmt(stats.totalProperties)}</p>
                            </div>
                            <Home className="w-5 h-5 text-blue-500" />
                        </div>
                        <p className="text-xs text-green-600 mt-1">active records</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Assessments</p>
                                <p className="text-xl font-bold text-gray-900">{fmt(stats.totalAssessments)}</p>
                            </div>
                            <FileText className="w-5 h-5 text-green-500" />
                        </div>
                        <p className="text-xs text-green-600 mt-1">{fmt(stats.approvedAssessments)} approved</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">PT Demands</p>
                                <p className="text-xl font-bold text-gray-900">{fmt(stats.houseTaxDemands)}</p>
                            </div>
                            <Receipt className="w-5 h-5 text-yellow-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">house tax demands</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-emerald-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">PT Revenue</p>
                                <p className="text-xl font-bold text-green-600">{fmtCur(stats.houseTaxRevenue)}</p>
                            </div>
                            <TrendingUp className="w-5 h-5 text-emerald-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">collected</p>
                    </div>
                    <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-medium">Outstanding</p>
                                <p className="text-xl font-bold text-red-600">{fmtCur(stats.houseTaxOutstanding)}</p>
                            </div>
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">pending collection</p>
                    </div>
                </div>
            )}

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
