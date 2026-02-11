import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { shopsAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Eye, Store } from 'lucide-react';

const CitizenShops = () => {
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const response = await shopsAPI.getAll({ limit: 100 });
      if (response.data.success) {
        setShops(response.data.data.shops || []);
      }
    } catch (error) {
      toast.error('Failed to fetch shops');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
        <Store className="w-8 h-8 mr-3 text-amber-600" />
        My Shops
      </h1>

      {shops.length === 0 ? (
        <div className="card text-center py-12">
          <Store className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">No shops found</p>
          <p className="text-gray-400 text-sm mt-2">Shops linked to your properties will appear here</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Shop Number</th>
                <th>Shop Name</th>
                <th>Type</th>
                <th>Property</th>
                <th>Ward</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {shops.map((shop) => (
                <tr key={shop.id}>
                  <td className="font-medium">{shop.shopNumber}</td>
                  <td>{shop.shopName}</td>
                  <td className="capitalize">{shop.shopType?.replace('_', ' ') || '—'}</td>
                  <td>
                    {shop.property ? (
                      <Link to={`/citizen/properties/${shop.propertyId}`} className="text-primary-600 hover:underline">
                        {shop.property.propertyNumber}
                      </Link>
                    ) : (
                      'N/A'
                    )}
                  </td>
                  <td>{shop.ward?.wardName || 'N/A'}</td>
                  <td>
                    <span className={`badge ${
                      shop.status === 'active' ? 'badge-success' :
                      shop.status === 'closed' ? 'badge-danger' :
                      'badge-warning'
                    } capitalize`}>
                      {shop.status}
                    </span>
                  </td>
                  <td>
                    <Link
                      to={`/citizen/shops/${shop.id}`}
                      className="text-primary-600 hover:text-primary-700 flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CitizenShops;
