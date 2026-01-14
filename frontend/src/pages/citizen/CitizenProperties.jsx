import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { citizenAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { Eye } from 'lucide-react';

const CitizenProperties = () => {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const response = await citizenAPI.getProperties();
      setProperties(response.data.data.properties);
    } catch (error) {
      toast.error('Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Properties</h1>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Property Number</th>
              <th>Address</th>
              <th>Ward</th>
              <th>Type</th>
              <th>Area</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {properties.length === 0 ? (
              <tr>
                <td colSpan="6" className="text-center py-8 text-gray-500">
                  No properties found
                </td>
              </tr>
            ) : (
              properties.map((property) => (
                <tr key={property.id}>
                  <td className="font-medium">{property.propertyNumber}</td>
                  <td>{property.address}</td>
                  <td>{property.ward?.wardName || 'N/A'}</td>
                  <td className="capitalize">{property.propertyType}</td>
                  <td>{property.area} sq. m</td>
                  <td>
                    <Link
                      to={`/citizen/properties/${property.id}`}
                      className="text-primary-600 hover:text-primary-700 flex items-center"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CitizenProperties;
