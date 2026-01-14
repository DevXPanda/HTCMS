import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { wardAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Eye, MapPin, Home, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const AssignedWards = () => {
  const { user } = useAuth();
  const [wards, setWards] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchWards();
    }
  }, [user]);

  const fetchWards = async () => {
    try {
      setLoading(true);
      const response = await wardAPI.getByCollector(user.id);
      setWards(response.data.data.wards || []);
    } catch (error) {
      toast.error('Failed to fetch assigned wards');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Assigned Wards</h1>

      {wards.length === 0 ? (
        <div className="card text-center py-12">
          <MapPin className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500 text-lg">No wards assigned</p>
          <p className="text-gray-400 text-sm mt-2">Contact administrator to get wards assigned</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wards.map((ward) => (
            <div key={ward.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{ward.wardName}</h3>
                  <p className="text-sm text-gray-500">Ward #{ward.wardNumber}</p>
                </div>
                <span className={`badge ${ward.isActive ? 'badge-success' : 'badge-danger'}`}>
                  {ward.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm">
                  <Home className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="text-gray-600">Properties:</span>
                  <span className="ml-2 font-medium">{ward.statistics?.totalProperties || 0}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Users className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="text-gray-600">Pending Demands:</span>
                  <span className="ml-2 font-medium text-orange-600">
                    {ward.statistics?.pendingDemands || 0}
                  </span>
                </div>
                {ward.description && (
                  <p className="text-sm text-gray-600 mt-2">{ward.description}</p>
                )}
              </div>

              <Link
                to={`/collector/properties?wardId=${ward.id}`}
                className="btn btn-primary w-full flex items-center justify-center"
              >
                <Eye className="w-4 h-4 mr-2" />
                View Properties
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AssignedWards;
