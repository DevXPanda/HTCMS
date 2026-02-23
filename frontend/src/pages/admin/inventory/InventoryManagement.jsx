import React, { useState, useEffect } from 'react';
import {
    Package,
    Plus,
    Minus,
    History,
    AlertTriangle,
    Search,
    Filter,
    ArrowRightLeft,
    X,
    Check
} from 'lucide-react';
import api from '../../../services/api';
import toast from 'react-hot-toast';

const InventoryManagement = () => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState(null);
    const [showTransactionModal, setShowTransactionModal] = useState(false);
    const [showAddItemModal, setShowAddItemModal] = useState(false);
    const [transactionType, setTransactionType] = useState('in');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    // Form states
    const [transactionForm, setTransactionForm] = useState({
        quantity: '',
        remarks: '',
        facility_id: '',
        facility_type: ''
    });

    const [newItemForm, setNewItemForm] = useState({
        name: '',
        category: 'cleaning',
        module: 'toilet',
        unit: 'pcs',
        min_stock_level: '10',
        current_stock: '0',
        description: ''
    });

    useEffect(() => {
        fetchItems();
    }, []);

    const fetchItems = async () => {
        try {
            setLoading(true);
            const response = await api.get('/inventory/items');
            if (response.data && response.data.success) {
                setItems(response.data.data.items);
            }
        } catch (error) {
            console.error('Failed to fetch inventory:', error);
            toast.error('Failed to fetch inventory items');
        } finally {
            setLoading(false);
        }
    };

    const handleTransaction = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/inventory/transactions', {
                inventory_item_id: selectedItem.id,
                transaction_type: transactionType,
                quantity: parseFloat(transactionForm.quantity),
                remarks: transactionForm.remarks,
                facility_id: transactionForm.facility_id || null,
                facility_type: transactionForm.facility_type || null,
                transaction_date: new Date().toISOString()
            });

            if (response.data && response.data.success) {
                toast.success(`Stock ${transactionType === 'in' ? 'added' : 'removed'} successfully`);
                setShowTransactionModal(false);
                setTransactionForm({ quantity: '', remarks: '', facility_id: '', facility_type: '' });
                fetchItems();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Transaction failed');
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        try {
            const response = await api.post('/inventory/items', newItemForm);
            if (response.data && response.data.success) {
                toast.success('Item added to inventory');
                setShowAddItemModal(false);
                setNewItemForm({
                    name: '',
                    category: 'cleaning',
                    module: 'toilet',
                    unit: 'pcs',
                    min_stock_level: '10',
                    current_stock: '0',
                    description: ''
                });
                fetchItems();
            }
        } catch (error) {
            toast.error('Failed to add inventory item');
        }
    };

    const filteredItems = items.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    if (loading) return <div className="p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-500 font-medium">Loading Inventory...</p>
    </div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Inventory & Asset Management</h1>
                    <p className="text-sm text-gray-500">Track and manage stock across all municipal facilities</p>
                </div>
                <button
                    onClick={() => setShowAddItemModal(true)}
                    className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-bold shadow-sm active:scale-95"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    New Item
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 bg-primary-50 rounded-xl">
                        <Package className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Unique Items</p>
                        <p className="text-3xl font-black text-gray-900">{items.length}</p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 bg-red-50 rounded-xl">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Low Stock Alerts</p>
                        <p className="text-3xl font-black text-red-600">
                            {items.filter(i => parseFloat(i.current_stock) <= parseFloat(i.min_stock_level)).length}
                        </p>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                    <div className="p-4 bg-green-50 rounded-xl">
                        <ArrowRightLeft className="w-6 h-6 text-green-600" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">System Status</p>
                        <p className="text-3xl font-black text-green-600 uppercase italic">Active</p>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by item name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all font-medium"
                    />
                </div>
                <div className="flex gap-2">
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Categories</option>
                        <option value="cleaning">Cleaning</option>
                        <option value="fodder">Fodder</option>
                        <option value="medical">Medical</option>
                        <option value="spare parts">Spare Parts</option>
                    </select>
                </div>
            </div>

            {/* Inventory List */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Item Name</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Category</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Usage Module</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Stock</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredItems.map((item) => (
                                <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900">{item.name}</p>
                                        <p className="text-[10px] text-gray-400 mt-0.5 truncate max-w-[200px]">{item.description || 'No description'}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${item.category === 'cleaning' ? 'bg-blue-100 text-blue-700' :
                                            item.category === 'fodder' ? 'bg-green-100 text-green-700' :
                                                item.category === 'medical' ? 'bg-red-100 text-red-700' :
                                                    'bg-gray-100 text-gray-700'
                                            }`}>
                                            {item.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-xs font-bold text-gray-500 uppercase">{item.module}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <p className="text-xl font-black text-gray-900">{item.current_stock}</p>
                                            <span className="text-[10px] text-gray-400 font-bold uppercase">{item.unit}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {parseFloat(item.current_stock) <= parseFloat(item.min_stock_level) ? (
                                            <div className="flex items-center gap-1.5 py-1 px-2 bg-red-50 text-red-600 rounded-lg w-max border border-red-100 animate-pulse">
                                                <AlertTriangle className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase">Low Stock</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 py-1 px-2 bg-green-50 text-green-600 rounded-lg w-max border border-green-100">
                                                <Check className="w-3 h-3" />
                                                <span className="text-[10px] font-black uppercase">Healthy</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => { setSelectedItem(item); setTransactionType('in'); setShowTransactionModal(true); }}
                                                className="p-2 bg-green-50 text-green-600 rounded-xl hover:bg-green-100 transition-colors shadow-sm"
                                                title="Record Receipt (In)"
                                            >
                                                <Plus className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedItem(item); setTransactionType('out'); setShowTransactionModal(true); }}
                                                className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-colors shadow-sm"
                                                title="Record Issue (Out)"
                                            >
                                                <Minus className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Transaction Modal */}
            {showTransactionModal && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className={`p-6 border-b flex justify-between items-center ${transactionType === 'in' ? 'bg-green-50/50' : 'bg-red-50/50'}`}>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">
                                    Record {transactionType === 'in' ? 'Stock Receipt' : 'Stock Issue'}
                                </h3>
                                <p className="text-sm font-bold text-gray-500">{selectedItem.name}</p>
                            </div>
                            <button onClick={() => setShowTransactionModal(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleTransaction} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Quantity ({selectedItem.unit})</label>
                                <input
                                    type="number"
                                    required
                                    min="0.01"
                                    step="0.01"
                                    value={transactionForm.quantity}
                                    onChange={(e) => setTransactionForm({ ...transactionForm, quantity: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Facility (Optional)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={transactionForm.facility_type}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, facility_type: e.target.value })}
                                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                                    >
                                        <option value="">Fac. Type</option>
                                        <option value="toilet">Toilet</option>
                                        <option value="mrf">MRF</option>
                                        <option value="gaushala">Gaushala</option>
                                    </select>
                                    <input
                                        type="text"
                                        placeholder="Fac. ID"
                                        value={transactionForm.facility_id}
                                        onChange={(e) => setTransactionForm({ ...transactionForm, facility_id: e.target.value })}
                                        className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Remarks</label>
                                <textarea
                                    value={transactionForm.remarks}
                                    onChange={(e) => setTransactionForm({ ...transactionForm, remarks: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 font-medium text-sm"
                                    rows="2"
                                ></textarea>
                            </div>
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    className={`w-full py-3 rounded-2xl font-black text-white px-2 mt-4 uppercase tracking-widest transition-all active:scale-95 shadow-lg ${transactionType === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                    Confirm Transaction
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Item Modal */}
            {showAddItemModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-6 border-b bg-primary-50/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Add New Inventory Item</h3>
                                <p className="text-sm font-bold text-gray-500">Define a new stock item in the system</p>
                            </div>
                            <button onClick={() => setShowAddItemModal(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>
                        <form onSubmit={handleAddItem} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Item Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={newItemForm.name}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold"
                                        placeholder="e.g. Bleaching Powder"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Category</label>
                                    <select
                                        value={newItemForm.category}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, category: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold"
                                    >
                                        <option value="cleaning">Cleaning</option>
                                        <option value="fodder">Fodder</option>
                                        <option value="medical">Medical</option>
                                        <option value="spare parts">Spare Parts</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Usage Module</label>
                                    <select
                                        value={newItemForm.module}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, module: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold"
                                    >
                                        <option value="toilet">Toilet</option>
                                        <option value="mrf">MRF</option>
                                        <option value="gaushala">Gaushala</option>
                                        <option value="general">General</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Unit</label>
                                    <input
                                        type="text"
                                        required
                                        value={newItemForm.unit}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold uppercase placeholder:lowercase"
                                        placeholder="kg, pcs, ltr"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Min. Stock Level</label>
                                    <input
                                        type="number"
                                        required
                                        value={newItemForm.min_stock_level}
                                        onChange={(e) => setNewItemForm({ ...newItemForm, min_stock_level: e.target.value })}
                                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Initial Stock</label>
                                <input
                                    type="number"
                                    required
                                    value={newItemForm.current_stock}
                                    onChange={(e) => setNewItemForm({ ...newItemForm, current_stock: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-1">Description</label>
                                <textarea
                                    value={newItemForm.description}
                                    onChange={(e) => setNewItemForm({ ...newItemForm, description: e.target.value })}
                                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 font-medium text-sm"
                                    rows="2"
                                    placeholder="Brief details about the item..."
                                ></textarea>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-primary-600 hover:bg-primary-700 rounded-2xl font-black text-white px-2 mt-4 uppercase tracking-widest transition-all shadow-lg active:scale-95"
                            >
                                Register Inventory Item
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryManagement;
