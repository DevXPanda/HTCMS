import React, { useState, useEffect } from 'react';
import {
    TrendingUp,
    Calendar,
    Package,
    Plus,
    ChevronRight,
    User,
    IndianRupee
} from 'lucide-react';
import api from '../../../services/api';

const MrfSalesLedger = ({ facilityId }) => {
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (facilityId) fetchSales();
    }, [facilityId]);

    const fetchSales = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/mrf/sales?facility_id=${facilityId}`);
            setSales(response.data.data.sales);
        } catch (error) {
            console.error('Failed to fetch sales:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="py-4 text-center text-xs text-gray-400 font-bold uppercase tracking-widest">Loading Sales...</div>;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-tight">
                    <IndianRupee className="w-4 h-4 text-primary-600" />
                    Sales & Revenue Ledger
                </h3>
                <button className="text-[10px] font-bold text-primary-600 hover:text-primary-700 uppercase flex items-center gap-1">
                    <Plus className="w-3 h-3" /> Record Sale
                </button>
            </div>

            {sales.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-lg p-8 text-center text-gray-400">
                    <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-xs font-medium uppercase tracking-widest leading-relaxed"> No sales recorded<br />Track revenue from recyclables</p>
                </div>
            ) : (
                <div className="space-y-2">
                    {sales.map((sale) => (
                        <div key={sale.id} className="bg-white border border-gray-100 rounded-lg p-3 hover:border-primary-200 transition-colors">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                        <Package className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-bold text-gray-900 capitalize">{sale.material_type}</p>
                                            <span className="text-[10px] font-black text-gray-400 uppercase">{sale.sale_date}</span>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <User className="w-3 h-3 text-gray-400" />
                                            <p className="text-[10px] text-gray-500 font-medium">{sale.buyer_name}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-primary-600">₹ {sale.total_amount}</p>
                                    <p className="text-[10px] text-gray-400 font-bold uppercase">{sale.weight_kg} KG @ ₹{sale.rate_per_kg}/kg</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MrfSalesLedger;
