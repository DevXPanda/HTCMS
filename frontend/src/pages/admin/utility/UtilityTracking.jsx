import React, { useState, useEffect } from 'react';
import {
    Zap,
    Droplets,
    Plus,
    Search,
    Calendar,
    CheckCircle2,
    Clock,
    ExternalLink
} from 'lucide-react';
import api from '../../../services/api';

const UtilityTracking = () => {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBills();
    }, []);

    const fetchBills = async () => {
        try {
            setLoading(true);
            const response = await api.get('/utilities/bills');
            setBills(response.data.data.bills);
        } catch (error) {
            console.error('Failed to fetch utility bills:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-8 text-center">Loading Utility Bills...</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Utility Bill Tracking</h1>
                    <p className="text-sm text-gray-500">Monitor electricity and water consumption for all facilities</p>
                </div>
                <button className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                    <Plus className="w-4 h-4 mr-2" />
                    Record New Bill
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Pending', val: '₹ 14,250', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                    { label: 'Bills Paid (MTD)', val: '₹ 45,800', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Elect. Usage', val: '4.2k kWh', icon: Zap, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Water Usage', val: '125 kL', icon: Droplets, color: 'text-blue-600', bg: 'bg-blue-50' }
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{stat.label}</p>
                                <p className="text-2xl font-black text-gray-900 mt-1">{stat.val}</p>
                            </div>
                            <div className={`p-2 ${stat.bg} rounded-lg`}>
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Bill Date</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Facility</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Type</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {bills.map((bill) => (
                            <tr key={bill.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-3 h-3 text-gray-400" />
                                        <p className="text-sm font-medium text-gray-900">{bill.bill_date}</p>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-bold text-gray-900 capitalize">{bill.facility_type}</p>
                                    <p className="text-[10px] text-gray-400 uppercase">ID: {bill.facility_id}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-1.5">
                                        {bill.utility_type === 'electricity' ? <Zap className="w-3 h-3 text-purple-500" /> : <Droplets className="w-3 h-3 text-blue-500" />}
                                        <span className="text-xs font-semibold capitalize">{bill.utility_type}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <p className="text-sm font-black text-gray-900">₹ {bill.amount}</p>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${bill.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                                            bill.payment_status === 'unpaid' ? 'bg-red-100 text-red-700' :
                                                'bg-amber-100 text-amber-700'
                                        }`}>
                                        {bill.payment_status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button className="p-1.5 bg-gray-50 text-gray-400 rounded hover:text-primary-600 transition-colors">
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default UtilityTracking;
