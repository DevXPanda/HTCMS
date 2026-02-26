import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { citizenAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { CreditCard, Eye, AlertCircle, Filter } from 'lucide-react';

const CitizenDemands = () => {
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const [serviceTypeFilter, setServiceTypeFilter] = useState(() => searchParams.get('serviceType') || 'all');

  // Sync filter from URL (e.g. browser back or initial load with ?serviceType=)
  useEffect(() => {
    const type = searchParams.get('serviceType') || 'all';
    setServiceTypeFilter(type);
  }, [searchParams]);

  useEffect(() => {
    fetchDemands();
  }, []);

  const fetchDemands = async () => {
    try {
      setLoading(true);
      const response = await citizenAPI.getDemands({});
      setDemands(response.data.data.demands || []);
    } catch (error) {
      toast.error('Failed to fetch demands');
    } finally {
      setLoading(false);
    }
  };

  const handleServiceTypeFilter = (type) => {
    setServiceTypeFilter(type);
    if (type === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ serviceType: type });
    }
  };

  // Tab counts from full list; displayed rows filtered by selected tab
  const houseTaxDemands = demands.filter(d => d.serviceType === 'HOUSE_TAX');
  const waterTaxDemands = demands.filter(d => d.serviceType === 'WATER_TAX');
  const d2dcDemands = demands.filter(d => d.serviceType === 'D2DC');
  const shopTaxDemands = demands.filter(d => d.serviceType === 'SHOP_TAX');
  const displayedDemands =
    serviceTypeFilter === 'all'
      ? demands
      : demands.filter(d => d.serviceType === serviceTypeFilter);

  // Group demands by property and financial year for combined view
  const groupedDemands = demands.reduce((acc, demand) => {
    const key = `${demand.propertyId}-${demand.financialYear}`;
    if (!acc[key]) {
      acc[key] = {
        property: demand.property,
        financialYear: demand.financialYear,
        demands: [],
        totalAmount: 0,
        paidAmount: 0,
        balanceAmount: 0,
        dueDate: demand.dueDate
      };
    }
    acc[key].demands.push(demand);
    acc[key].totalAmount += parseFloat(demand.totalAmount || 0);
    acc[key].paidAmount += parseFloat(demand.paidAmount || 0);
    acc[key].balanceAmount += parseFloat(demand.balanceAmount || 0);
    // Use earliest due date
    if (new Date(demand.dueDate) < new Date(acc[key].dueDate)) {
      acc[key].dueDate = demand.dueDate;
    }
    return acc;
  }, {});

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'badge-warning',
      partially_paid: 'badge-info',
      paid: 'badge-success',
      overdue: 'badge-danger'
    };
    return badges[status] || 'badge-info';
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="ds-page-title">My Demands</h1>
        <div className="flex gap-2">
          <button
            onClick={() => handleServiceTypeFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${serviceTypeFilter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            All ({demands.length})
          </button>
          <button
            onClick={() => handleServiceTypeFilter('HOUSE_TAX')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${serviceTypeFilter === 'HOUSE_TAX'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            House Tax ({houseTaxDemands.length})
          </button>
          <button
            onClick={() => handleServiceTypeFilter('WATER_TAX')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${serviceTypeFilter === 'WATER_TAX'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Water Tax ({waterTaxDemands.length})
          </button>
          <button
            onClick={() => handleServiceTypeFilter('D2DC')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${serviceTypeFilter === 'D2DC'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            D2DC ({d2dcDemands.length})
          </button>
          <button
            onClick={() => handleServiceTypeFilter('SHOP_TAX')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${serviceTypeFilter === 'SHOP_TAX'
                ? 'bg-amber-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
          >
            Shop Tax ({shopTaxDemands.length})
          </button>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Service Type</th>
              <th>Demand Number</th>
              <th>Property</th>
              <th>Period</th>
              <th>Total Amount</th>
              <th>Paid Amount</th>
              <th>Balance</th>
              <th>Due Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedDemands.length === 0 ? (
              <tr>
                <td colSpan="10" className="text-center py-8 text-gray-500">
                  {demands.length === 0 ? 'No demands found' : `No ${serviceTypeFilter.replace('_', ' ').toLowerCase()} demands`}
                </td>
              </tr>
            ) : (
              displayedDemands.map((demand) => {
                const isOverdue = new Date(demand.dueDate) < new Date() && demand.balanceAmount > 0;
                const isD2DC = demand.serviceType === 'D2DC';
                const isWaterTax = demand.serviceType === 'WATER_TAX';
                const isShopTax = demand.serviceType === 'SHOP_TAX';
                return (
                  <tr key={demand.id} className={isOverdue ? 'bg-red-50' : ''}>
                    <td className="whitespace-nowrap">
                      <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${isD2DC
                          ? 'bg-green-100 text-green-800 border border-green-300'
                          : isWaterTax
                            ? 'bg-cyan-100 text-cyan-800 border border-cyan-300'
                            : isShopTax
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-blue-100 text-blue-800 border border-blue-300'
                        }`}>
                        {isD2DC ? 'D2DC' : isWaterTax ? 'Water Tax' : isShopTax ? 'Shop Tax' : 'House Tax'}
                      </span>
                    </td>
                    <td className="font-medium">{demand.demandNumber}</td>
                    <td>
                      {isShopTax && demand.shopTaxAssessment?.shop ? (
                        <div>
                          <div className="font-medium">{demand.shopTaxAssessment.shop.shopName}</div>
                          <div className="text-xs text-gray-500">{demand.property?.propertyNumber || 'N/A'}</div>
                        </div>
                      ) : (
                        demand.property?.propertyNumber || 'N/A'
                      )}
                    </td>
                    <td>
                      {isD2DC ? (
                        <span className="text-sm">{demand.financialYear}</span>
                      ) : (
                        <span>{demand.financialYear}</span>
                      )}
                    </td>
                    <td>₹{parseFloat(demand.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                    <td className="text-green-600">
                      ₹{parseFloat(demand.paidAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`font-semibold ${demand.balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{parseFloat(demand.balanceAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                      {new Date(demand.dueDate).toLocaleDateString()}
                      {isOverdue && <span className="ml-1">⚠️</span>}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(demand.status)} capitalize`}>
                        {demand.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/citizen/demands/${demand.id}`}
                          className="text-primary-600 hover:text-primary-700"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        {demand.balanceAmount > 0 && (
                          <Link
                            to={`/citizen/payments/online/${demand.id}`}
                            className="text-green-600 hover:text-green-700"
                            title="Pay Online"
                          >
                            <CreditCard className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CitizenDemands;
