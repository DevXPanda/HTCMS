import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
    ArrowLeft,
    Search,
    Plus,
    Filter,
    MoreVertical,
    Trash2,
    Edit,
    Activity,
    User,
    Calendar,
    Save,
    X
} from 'lucide-react';
import api from '../../../services/api';

const CattleManagement = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [cattle, setCattle] = useState([]);
    const [facility, setFacility] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAnimal, setEditingAnimal] = useState(null);

    const [formData, setFormData] = useState({
        gau_shala_facility_id: id,
        tag_number: '',
        animal_type: 'cow',
        gender: 'Female',
        date_of_birth: '',
        health_status: 'healthy',
        notes: ''
    });

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [facRes, cattleRes] = await Promise.all([
                api.get(`/gaushala/facilities/${id}`),
                api.get(`/gaushala/facilities/${id}/cattle`)
            ]);
            setFacility(facRes.data.data.facility);
            setCattle(cattleRes.data.data.cattle);
        } catch (error) {
            console.error('Failed to fetch cattle data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingAnimal) {
                await api.put(`/gaushala/cattle/${editingAnimal.id}`, formData);
            } else {
                await api.post(`/gaushala/facilities/${id}/cattle`, formData);
            }
            setShowAddModal(false);
            setEditingAnimal(null);
            setFormData({
                gau_shala_facility_id: id,
                tag_number: '',
                animal_type: 'cow',
                gender: 'Female',
                date_of_birth: '',
                health_status: 'healthy',
                notes: ''
            });
            fetchData();
        } catch (error) {
            console.error('Failed to save animal:', error);
            alert('Failed to save animal record.');
        }
    };

    const handleEdit = (animal) => {
        setEditingAnimal(animal);
        setFormData({
            ...animal,
            date_of_birth: animal.date_of_birth ? animal.date_of_birth.split('T')[0] : ''
        });
        setShowAddModal(true);
    };

    const handleDelete = async (animalId) => {
        if (window.confirm('Are you sure you want to delete this cattle record?')) {
            try {
                await api.delete(`/gaushala/cattle/${animalId}`);
                fetchData();
            } catch (error) {
                console.error('Failed to delete cattle:', error);
            }
        }
    };

    const filteredCattle = cattle.filter(c =>
        c.tag_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.animal_type?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return <div className="p-12 text-center">Loading cattle records...</div>;
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Cattle Management</h1>
                        <p className="text-gray-500 text-sm">{facility?.name}</p>
                    </div>
                </div>
                <button
                    onClick={() => { setEditingAnimal(null); setShowAddModal(true); }}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add New Animal
                </button>
            </div>

            {/* Search and Filter */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by Tag Number or Type..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 flex items-center gap-2 hover:bg-gray-100 transition-colors">
                    <Filter className="w-4 h-4" /> Filters
                </button>
            </div>

            {/* Cattle Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Tag / Animal ID</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Type & Gender</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Health Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest">Date of Birth</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {filteredCattle.length > 0 ? (
                                filteredCattle.map((animal) => (
                                    <tr key={animal.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-orange-100 rounded-lg flex items-center justify-center text-orange-700 font-bold uppercase">
                                                    {animal.animal_type?.[0]}
                                                </div>
                                                <span className="text-sm font-bold text-gray-900">{animal.tag_number || 'ID: ' + animal.id}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm">
                                                <p className="font-semibold text-gray-900 capitalize">{animal.animal_type}</p>
                                                <p className="text-xs text-gray-500">{animal.gender}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${animal.health_status === 'healthy'
                                                    ? 'bg-green-50 text-green-700 border-green-100'
                                                    : animal.health_status === 'sick'
                                                        ? 'bg-red-50 text-red-700 border-red-100'
                                                        : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                                }`}>
                                                {animal.health_status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {animal.date_of_birth ? new Date(animal.date_of_birth).toLocaleDateString() : 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleEdit(animal)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(animal.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-400 text-sm">No cattle records found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">
                                {editingAnimal ? 'Edit Animal Record' : 'Add New Animal'}
                            </h3>
                            <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Tag Number</label>
                                    <input
                                        type="text"
                                        name="tag_number"
                                        value={formData.tag_number}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                        placeholder="Enter tag ID"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Animal Type</label>
                                    <select
                                        name="animal_type"
                                        value={formData.animal_type}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
                                    >
                                        <option value="cow">Cow</option>
                                        <option value="bull">Bull</option>
                                        <option value="calf">Calf</option>
                                        <option value="buffalo">Buffalo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Gender</label>
                                    <select
                                        name="gender"
                                        value={formData.gender}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
                                    >
                                        <option value="Female">Female</option>
                                        <option value="Male">Male</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Date of Birth</label>
                                    <input
                                        type="date"
                                        name="date_of_birth"
                                        value={formData.date_of_birth}
                                        onChange={handleInputChange}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Health Status</label>
                                <div className="flex gap-2">
                                    {['healthy', 'sick', 'observation'].map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, health_status: s }))}
                                            className={`flex-1 py-1.5 text-[10px] font-bold uppercase rounded-lg border transition-all ${formData.health_status === s
                                                    ? 'bg-primary-600 border-primary-600 text-white shadow-lg shadow-primary-200'
                                                    : 'bg-white border-gray-100 text-gray-500 hover:border-primary-200'
                                                }`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Notes</label>
                                <textarea
                                    name="notes"
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                    rows="3"
                                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none resize-none"
                                    placeholder="Additional information..."
                                ></textarea>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2 text-sm font-bold text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-primary-600 text-white rounded-lg text-sm font-bold hover:bg-primary-700 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Save className="w-4 h-4" />
                                    {editingAnimal ? 'Update Animal' : 'Save Animal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CattleManagement;
