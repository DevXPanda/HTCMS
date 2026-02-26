import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { demandAPI } from '../../services/api';
import Loading from '../../components/Loading';
import toast from 'react-hot-toast';
import { CreditCard } from 'lucide-react';
import DemandDetailsView from '../../components/DemandDetailsView';

const DemandDetails = () => {
  const { id } = useParams();
  const [demand, setDemand] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDemand();
  }, [id]);

  const fetchDemand = async () => {
    try {
      const response = await demandAPI.getById(id);
      setDemand(response.data.data.demand);
    } catch (error) {
      toast.error('Failed to fetch tax demand details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading />;
  if (!demand) return <div>Tax Demand not found</div>;

  return (
    <DemandDetailsView
      demand={demand}
      backTo="/citizen/demands"
      backLabel="Back to Tax Demands"
      title="Tax Demand Details"
      propertyNumberLink={demand.property ? `/citizen/properties/${demand.property.id}` : undefined}
      actionButtons={
        parseFloat(demand.balanceAmount || 0) > 0 ? (
          <Link
            to={`/citizen/payments/online/${id}`}
            className="btn btn-primary flex items-center"
          >
            <CreditCard className="w-4 h-4 mr-2" />
            Pay Online
          </Link>
        ) : null
      }
    >
      {demand.remarks && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/80">
            <h2 className="font-semibold text-gray-900">Remarks</h2>
          </div>
          <div className="p-5">
            <p className="text-gray-600 whitespace-pre-wrap text-sm">{demand.remarks}</p>
          </div>
        </div>
      )}
    </DemandDetailsView>
  );
};

export default DemandDetails;
